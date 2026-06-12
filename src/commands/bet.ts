import { readMatches, readBets, writeBets } from '../lib/storage';
import { settleBet } from '../lib/settler';
import { teamZhName } from '../lib/parser';
import { parseMultiBets } from '../lib/parser';
import { Match, Bet, BetType } from '../types';
import { genId, findMatchById, resolveTeamForBet, findMatchByTeamName, parseMatchDescription } from './helpers';
import fs from 'fs';

export function cmdAddBet(args: Record<string, string>) {
  let matchId = args.match;
  const betType = args.type as BetType;
  let selection = args.selection;
  const odds = parseFloat(args.odds);
  const stake = parseFloat(args.stake);
  const bettorId = args.bettor || undefined;

  if (!betType || !selection || isNaN(odds) || isNaN(stake)) {
    console.error('❌ 用法: add-bet --match <matchId> --type <1X2|handicap|over_under|correct_score|custom> --selection <选项> --odds <赔率> --stake <金额> [--bettor <名字>]');
    console.error('   示例: add-bet --match match_1 --type 1X2 --selection France --odds 1.8 --stake 100');
    console.error('   或:   add-bet --match "韩国 vs 捷克" --type 1X2 --selection 韩国 --odds 2.5 --stake 100 --bettor 小明');
    process.exit(1);
  }

  if (!['1X2', 'handicap', 'over_under', 'correct_score', 'custom'].includes(betType)) {
    console.error(`❌ 不支持的玩法: ${betType}`);
    process.exit(1);
  }

  const matches = readMatches();

  // 如果 match 不是 match_xxx 格式，尝试从队名匹配
  if (matchId && !matchId.startsWith('match_')) {
    const parsed = parseMatchDescription(matchId);
    if (parsed) {
      const found = findMatchByTeamName(matches, parsed.teamA, parsed.teamB);
      if (found) {
        matchId = found.id;
      } else {
        console.error(`❌ 找不到比赛: ${matchId}`);
        console.error('   可用比赛:');
        matches.filter(m => m.status === 'scheduled').slice(0, 10).forEach(m => {
          console.error(`     ${m.id}: ${teamZhName(m.teamA)} vs ${teamZhName(m.teamB)}`);
        });
        process.exit(1);
      }
    }
  }

  if (!matchId) {
    console.error('❌ 用法: add-bet --match <matchId> --type <玩法> --selection <选项> --odds <赔率> --stake <金额>');
    process.exit(1);
  }

  const match = findMatchById(matches, matchId);
  if (!match) {
    console.error(`❌ 找不到比赛: ${matchId}`);
    process.exit(1);
  }

  const resolvedSelection = resolveTeamForBet(match, selection);

  const metadata: Record<string, unknown> = {};
  if (betType === 'handicap') {
    const hv = parseFloat(args.handicap ?? args.value ?? '0');
    if (isNaN(hv)) {
      console.error('❌ 让球玩法需要 --handicap <让球值>，如 --handicap -1.5');
      process.exit(1);
    }
    metadata.handicapValue = hv;
  }
  if (betType === 'over_under') {
    const threshold = parseFloat(args.threshold ?? args.value ?? '2.5');
    if (isNaN(threshold)) {
      console.error('❌ 大小球玩法需要 --threshold <阈值>，如 --threshold 2.5');
      process.exit(1);
    }
    metadata.threshold = threshold;
  }
  if (args.notes) {
    metadata.notes = args.notes;
  }

  const bet: Bet = {
    id: `bet_${genId()}`,
    matchId,
    betType,
    betSelection: resolvedSelection,
    odds,
    stake,
    status: 'pending',
    createdAt: new Date().toISOString(),
    bettorId,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };

  if (match.status === 'finished' && match.scoreA !== null && match.scoreB !== null) {
    const settled = settleBet(bet, match);
    if (settled !== 'pending') {
      bet.status = settled;
    }
  }

  const bets = readBets();
  bets.push(bet);
  writeBets(bets);
  const zhA = teamZhName(match.teamA);
  const zhB = teamZhName(match.teamB);
  const statusTag = bet.status === 'won' ? ' 🟢 已赢' : bet.status === 'lost' ? ' 🔴 已输' : '';
  console.log(`✅ 注单已添加`);
  console.log(`   比赛: ${zhA} vs ${zhB} (${match.group})`);
  console.log(`   玩法: ${betType} | 选项: ${resolvedSelection} | 赔率: ${odds} | 金额: ${stake}`);
  console.log(`   状态: ${bet.status}${statusTag}`);
  console.log(`   注单ID: ${bet.id}`);
}

export function cmdDeleteBet(args: Record<string, string>) {
  const betId = args.id;
  if (!betId) {
    console.error('❌ 用法: delete-bet --id <betId>');
    process.exit(1);
  }

  const bets = readBets();
  const idx = bets.findIndex(b => b.id === betId);
  if (idx === -1) {
    console.error(`❌ 找不到注单: ${betId}`);
    process.exit(1);
  }

  const removed = bets[idx];
  const matches = readMatches();
  const match = matches.find(m => m.id === removed.matchId);
  const matchDesc = match ? `${teamZhName(match.teamA)} vs ${teamZhName(match.teamB)}` : removed.matchId;

  const updated = bets.filter(b => b.id !== betId);
  writeBets(updated);
  console.log(`✅ 已删除注单: ${matchDesc} | ${removed.betType} ${removed.betSelection} | 赔率 ${removed.odds} | 金额 ${removed.stake}`);
}

export function cmdImportBets(args: Record<string, string>) {
  let text = '';
  if (args.file) {
    text = fs.readFileSync(args.file, 'utf-8');
  } else if (args.text) {
    text = args.text;
  } else {
    text = fs.readFileSync(0, 'utf-8');
  }

  const parsed = parseMultiBets(text);
  if (parsed.length === 0) {
    console.error('❌ 未能解析出任何注单，请检查文本格式');
    process.exit(1);
  }

  const bets = readBets();
  const matches = readMatches();
  let imported = 0;
  let skipped = 0;

  for (const p of parsed) {
    if (!p.matchId) {
      console.log(`  ⚠️  跳过: ${p.teamA} vs ${p.teamB} - 找不到对应比赛`);
      skipped++;
      continue;
    }

    const match = matches.find(m => m.id === p.matchId);
    let status: 'pending' | 'won' | 'lost' | 'void' = 'pending';
    if (match?.status === 'finished' && match.scoreA !== null && match.scoreB !== null) {
      const tempBet = { id: '', matchId: p.matchId, betType: p.betType as BetType, betSelection: p.selection, odds: p.odds, stake: p.stake, status: 'pending' as const, createdAt: '' };
      const settled = settleBet(tempBet, match);
      if (settled !== 'pending') status = settled;
    }

    const bet = {
      id: `bet_${genId()}`,
      matchId: p.matchId,
      betType: p.betType as BetType,
      betSelection: p.selection,
      odds: p.odds,
      stake: p.stake,
      status,
      createdAt: new Date().toISOString(),
    };
    bets.push(bet);
    imported++;

    const matchDesc = match ? `${teamZhName(match.teamA)} vs ${teamZhName(match.teamB)}` : p.matchId;
    const statusTag = status === 'won' ? ' 🟢' : status === 'lost' ? ' 🔴' : '';
    console.log(`  ✅ ${matchDesc} | ${p.betType} ${p.selection} @${p.odds} × ${p.stake}${statusTag}`);
  }

  writeBets(bets);
  console.log(`\n📊 导入完成: ${imported} 注成功, ${skipped} 注跳过`);
}
