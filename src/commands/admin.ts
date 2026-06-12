import { ensureDataDir, readMatches, readBets, writeBets, readPredictions, writePredictions } from '../lib/storage';
import { settleAllBets } from '../lib/settler';
import { teamZhName } from '../lib/parser';
import { loadConfig, saveConfig } from './helpers';
import { detectStreakNotifications, formatStreakNotifications } from '../lib/streakDetector';
import fs from 'fs';
import path from 'path';

export function cmdInit() {
  ensureDataDir();
  const matches = readMatches();
  console.log(`✅ 初始化完成，已加载 ${matches.length} 场比赛`);

  const groups = new Set(matches.filter(m => m.group.startsWith('Group')).map(m => m.group));
  console.log(`   小组: ${[...groups].sort().join(', ')}`);

  const knockouts = matches.filter(m => !m.group.startsWith('Group') && !m.group.startsWith('3rd')).length;
  console.log(`   淘汰赛: ${knockouts} 场`);
}

export function cmdSettle() {
  const matches = readMatches();
  const bets = readBets();
  const result = settleAllBets(bets, matches);

  if (result.changedCount === 0) {
    console.log('ℹ️  没有需要结算的注单');
    return;
  }

  writeBets(result.updatedBets);
  console.log(`✅ 已结算 ${result.settledCount} 注新注单，共更新 ${result.changedCount} 注`);

  const updated = result.updatedBets.filter(b => {
    const orig = bets.find(ob => ob.id === b.id);
    return orig && orig.status !== b.status;
  });

  for (const b of updated) {
    const match = matches.find(m => m.id === b.matchId);
    const matchDesc = match ? `${teamZhName(match.teamA)} vs ${teamZhName(match.teamB)}` : b.matchId;
    const emoji = b.status === 'won' ? '🟢' : b.status === 'lost' ? '🔴' : '⚪';
    console.log(`  ${emoji} ${matchDesc} | ${b.betType} ${b.betSelection} → ${b.status}`);
  }
}

export function cmdDeposit(args: Record<string, string>, positional: string[]) {
  const amount = parseFloat(args.amount ?? positional[0] ?? '');
  if (isNaN(amount)) {
    console.error('❌ 用法: deposit <金额>');
    process.exit(1);
  }
  const config = loadConfig();
  config.initialDeposit += amount;
  saveConfig(config);
  console.log(`✅ 已存入 ${amount}，当前初始金额: ${config.initialDeposit}`);
}

export function cmdReset(args: Record<string, string>) {
  const doReset = () => {
    const DATA_DIR = path.join(process.cwd(), 'data');
    const BETS_PATH = path.join(DATA_DIR, 'bets.json');
    const PREDICTIONS_PATH = path.join(DATA_DIR, 'predictions.json');
    const MATCHES_PATH = path.join(DATA_DIR, 'matches.json');
    const STATIC_SCHEDULE_PATH = path.join(__dirname, '..', 'data', 'worldcup2026.json');

    const atomicWrite = (p: string, data: unknown) => {
      const tmp = `${p}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
      fs.renameSync(tmp, p);
    };

    atomicWrite(BETS_PATH, []);
    atomicWrite(PREDICTIONS_PATH, { groupStandings: {}, bestThirdTeams: [], bracket: {} });

    let raw = fs.readFileSync(STATIC_SCHEDULE_PATH, 'utf-8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    const staticData = JSON.parse(raw);
    atomicWrite(MATCHES_PATH, staticData.matches);

    console.log('✅ 数据已重置：注单清空、预测清空、赛程重新加载');
  };

  if (args.confirm === 'true' || args.y === 'true') {
    doReset();
    return;
  }

  console.log('⚠️  即将清空所有注单和预测数据，比赛赛程将重新初始化。');
  console.log('   输入 y 确认，其他取消：');

  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('> ', (answer: string) => {
    rl.close();
    if (answer.trim().toLowerCase() !== 'y') {
      console.log('已取消');
      return;
    }
    doReset();
  });
}

export function cmdCheckAndNotify() {
  const matches = readMatches();
  const bets = readBets();

  const finishedMatchIds = new Set(matches.filter(m => m.status === 'finished').map(m => m.id));
  const relevantBets = bets.filter(b => finishedMatchIds.has(b.matchId));

  if (relevantBets.length === 0) {
    console.log('ℹ️  没有已结束比赛的注单');
    return;
  }

  const result = settleAllBets(bets, matches);
  if (result.changedCount > 0) {
    writeBets(result.updatedBets);
  }

  const changed = result.changedCount > 0
    ? result.updatedBets.filter(b => {
        const orig = bets.find(ob => ob.id === b.id);
        return orig && orig.status !== b.status;
      })
    : [];

  const settled = changed.length > 0 ? changed : relevantBets.filter(b => b.status !== 'pending');

  if (settled.length === 0) {
    console.log('ℹ️  没有需要结算的注单');
    return;
  }

  const totalWon = settled.filter(b => b.status === 'won').reduce((a, b) => a + b.stake * (b.odds - 1), 0);
  const totalLost = settled.filter(b => b.status === 'lost').reduce((a, b) => a + b.stake, 0);

  const notify = {
    timestamp: new Date().toISOString(),
    settled: settled.map(b => {
      const match = matches.find(m => m.id === b.matchId);
      const profit = b.status === 'won' ? `+${(b.stake * (b.odds - 1)).toFixed(2)}` :
                     b.status === 'lost' ? `-${b.stake.toFixed(2)}` : '0';
      return {
        match: match ? `${teamZhName(match.teamA)} vs ${teamZhName(match.teamB)}` : b.matchId,
        bet: `${b.betType} ${b.betSelection}`,
        odds: b.odds,
        stake: b.stake,
        result: b.status,
        profit,
      };
    }),
    summary: `结算 ${settled.length} 注，赢 +${totalWon.toFixed(2)}，输 -${totalLost.toFixed(2)}，净收益 ${(totalWon - totalLost).toFixed(2)}`,
  };

  const notifyPath = path.join(process.cwd(), 'data', 'notify.json');
  fs.writeFileSync(notifyPath, JSON.stringify(notify, null, 2));

  console.log(`\n🔔 ${notify.summary}`);
  for (const s of notify.settled) {
    const emoji = s.result === 'won' ? '🟢' : s.result === 'lost' ? '🔴' : '⚪';
    console.log(`  ${emoji} ${s.match} | ${s.bet} @${s.odds} × ${s.stake} → ${s.result} ${s.profit}`);
  }
  console.log(`\n📄 通知已写入: ${notifyPath}`);

  // 检测连胜/连败通知
  const allBets = result.changedCount > 0 ? result.updatedBets : bets;
  const streakNotifications = detectStreakNotifications(allBets);
  if (streakNotifications.length > 0) {
    console.log(formatStreakNotifications(streakNotifications));
  }
}
