import { readMatches, writeMatches, readBets, writeBets, readPredictions } from '../lib/storage';
import { settleAllBets } from '../lib/settler';
import { resolveBracketMatches } from '../lib/bracketResolver';
import { teamZhName } from '../lib/parser';
import { printMatch } from './helpers';

export function cmdUpdateMatch(args: Record<string, string>) {
  const matchId = args.match;
  const scoreA = parseInt(args['score-a'] ?? args.scoreA ?? '');
  const scoreB = parseInt(args['score-b'] ?? args.scoreB ?? '');

  if (!matchId || isNaN(scoreA) || isNaN(scoreB)) {
    console.error('❌ 用法: update-match --match <matchId> --score-a <分数> --score-b <分数> [--winner <队名>]');
    process.exit(1);
  }

  if (scoreA < 0 || scoreB < 0) {
    console.error('❌ 分数不能为负数');
    process.exit(1);
  }
  if (scoreA > 30 || scoreB > 30) {
    console.error('❌ 分数异常偏高，请检查');
    process.exit(1);
  }

  const matches = readMatches();
  const matchIdx = matches.findIndex(m => m.id === matchId);
  if (matchIdx === -1) {
    console.error(`❌ 找不到比赛: ${matchId}`);
    process.exit(1);
  }

  const match = matches[matchIdx];
  const winner = args.winner ?? null;

  matches[matchIdx] = {
    ...match,
    scoreA,
    scoreB,
    status: 'finished',
    winner,
  };

  writeMatches(matches);

  const settled = settleAllBets(readBets(), matches);
  if (settled.changedCount > 0) {
    writeBets(settled.updatedBets);
  }

  const zhA = teamZhName(match.teamA);
  const zhB = teamZhName(match.teamB);
  console.log(`✅ 比分已更新: ${zhA} ${scoreA} - ${scoreB} ${zhB}`);
  if (settled.settledCount > 0) {
    console.log(`   🎯 自动结算了 ${settled.settledCount} 注注单`);
  }
}

export function cmdListMatches(args: Record<string, string>) {
  const matches = readMatches();
  const predictions = readPredictions();
  const resolved = resolveBracketMatches('live', predictions, matches);

  let filtered = resolved;
  if (args.group) {
    filtered = resolved.filter(m => m.group === args.group);
  }
  if (args.status) {
    filtered = filtered.filter(m => m.status === args.status);
  }

  if (filtered.length === 0) {
    console.log('ℹ️  没有找到比赛');
    return;
  }

  console.log(`\n⚽ 比赛列表 (${filtered.length} 场)`);
  for (const m of filtered) {
    printMatch(m);
  }
}

export function cmdStatus(args: Record<string, string>) {
  const matches = readMatches();
  const bets = readBets();
  const predictions = readPredictions();

  const resolved = resolveBracketMatches('live', predictions, matches);

  if (args.summary === 'true') {
    // 精简模式：只显示有注单的比赛 + 即将开赛的比赛
    const betMatchIds = new Set(bets.map(b => b.matchId));
    const betMatches = resolved.filter(m => betMatchIds.has(m.id));
    const upcoming = resolved
      .filter(m => m.status === 'scheduled' && !betMatchIds.has(m.id))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);

    if (betMatches.length === 0 && upcoming.length === 0) {
      console.log('📭 暂无注单，也没有即将开赛的比赛');
      return;
    }

    if (betMatches.length > 0) {
      console.log(`\n🎯 你的注单 (${betMatches.length} 场)`);
      for (const m of betMatches) {
        const matchBets = bets.filter(b => b.matchId === m.id);
        const score = m.status === 'finished' ? `${m.scoreA}-${m.scoreB}` : 'vs';
        console.log(`  ${m.status === 'finished' ? '✅' : '⏳'} ${teamZhName(m.teamA)} ${score} ${teamZhName(m.teamB)}`);
        for (const b of matchBets) {
          const tag = b.status === 'won' ? ' 🟢' : b.status === 'lost' ? ' 🔴' : '';
          console.log(`     ${b.betType} ${b.betSelection} @${b.odds} × ${b.stake}${tag}`);
        }
      }
    }

    if (upcoming.length > 0) {
      console.log(`\n📅 即将开赛 (${upcoming.length} 场)`);
      for (const m of upcoming) {
        const date = new Date(m.date).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        console.log(`  ⏳ ${date} ${teamZhName(m.teamA)} vs ${teamZhName(m.teamB)} (${m.group})`);
      }
    }

    // 盈亏摘要
    const pending = bets.filter(b => b.status === 'pending');
    const won = bets.filter(b => b.status === 'won');
    const lost = bets.filter(b => b.status === 'lost');
    if (bets.length > 0) {
      const totalStake = bets.reduce((s, b) => s + b.stake, 0);
      const totalReturn = won.reduce((s, b) => s + b.stake * b.odds, 0);
      console.log(`\n💰 共 ${bets.length} 注 | 待结算 ${pending.length} | 赢 ${won.length} | 输 ${lost.length} | 投入 ${totalStake} | 回报 ${totalReturn.toFixed(2)}`);
    }
    return;
  }

  if (args.group) {
    const group = args.group;
    const groupMatches = resolved.filter(m => m.group === group);
    if (groupMatches.length === 0) {
      console.error(`❌ 找不到分组: ${group}`);
      return;
    }
    console.log(`\n📋 ${group} (${groupMatches.length} 场)`);
    for (const m of groupMatches) {
      printMatch(m);
    }
  } else if (args.status) {
    const status = args.status;
    const filtered = resolved.filter(m => m.status === status);
    console.log(`\n📋 ${status === 'finished' ? '已完成' : '未开始'} 比赛 (${filtered.length} 场)`);
    for (const m of filtered) {
      printMatch(m);
    }
  } else {
    const groups = new Set(matches.filter(m => m.group.startsWith('Group')).map(m => m.group));
    for (const g of [...groups].sort()) {
      const groupMatches = resolved.filter(m => m.group === g);
      console.log(`\n📋 ${g}`);
      for (const m of groupMatches) {
        printMatch(m);
      }
    }

    const knockoutGroups = ['Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Third Place Match', 'Final'];
    for (const kg of knockoutGroups) {
      const kgMatches = resolved.filter(m => m.group === kg);
      if (kgMatches.length > 0) {
        console.log(`\n🏆 ${kg}`);
        for (const m of kgMatches) {
          printMatch(m);
        }
      }
    }

    console.log(`\n📊 注单概览: 共 ${bets.length} 注`);
    const pending = bets.filter(b => b.status === 'pending').length;
    const won = bets.filter(b => b.status === 'won').length;
    const lost = bets.filter(b => b.status === 'lost').length;
    console.log(`   待结算: ${pending} | 赢: ${won} | 输: ${lost}`);
  }
}
