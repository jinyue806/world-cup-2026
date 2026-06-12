import { readMatches, readBets, writeBets } from '../lib/storage';
import { settleBet } from '../lib/settler';
import { teamZhName } from '../lib/parser';
import { parseMultiBets } from '../lib/parser';
import { Match, Bet, BetType } from '../types';
import { genId, findMatchById, resolveTeamForBet, findMatchByTeamName, parseMatchDescription } from './helpers';
import { fetchWorldcupMatches, type BettingMatch } from '../lib/bettingApi';
import fs from 'fs';

/**
 * 从投注平台 API 获取比赛赔率
 */
async function getMatchOdds(match: Match): Promise<{ home: number; draw: number; away: number } | null> {
  try {
    const bettingMatches = await fetchWorldcupMatches(1, 100);
    
    // 尝试匹配比赛
    const bettingMatch = bettingMatches.find(bm => {
      const homeMatch = bm.teamA.name.toLowerCase().includes(match.teamA.toLowerCase()) ||
                       match.teamA.toLowerCase().includes(bm.teamA.name.toLowerCase());
      const awayMatch = bm.teamB.name.toLowerCase().includes(match.teamB.toLowerCase()) ||
                       match.teamB.toLowerCase().includes(bm.teamB.name.toLowerCase());
      return homeMatch && awayMatch;
    });
    
    if (bettingMatch) {
      const winMarket = bettingMatch.markets.find(m => m.name === '独赢');
      if (winMarket) {
        const homeOdds = winMarket.options.find(o => o.name === bettingMatch.teamA.name)?.odds || 0;
        const drawOdds = winMarket.options.find(o => o.name === '平局')?.odds || 0;
        const awayOdds = winMarket.options.find(o => o.name === bettingMatch.teamB.name)?.odds || 0;
        
        if (homeOdds > 0 && drawOdds > 0 && awayOdds > 0) {
          return { home: homeOdds, draw: drawOdds, away: awayOdds };
        }
      }
    }
  } catch (e) {
    // API 获取失败时静默返回 null
  }
  return null;
}

export async function cmdAddBet(args: Record<string, string>) {
  let matchId = args.match;
  const betType = args.type as BetType;
  let selection = args.selection;
  let odds = parseFloat(args.odds);
  const stake = parseFloat(args.stake);
  const bettorId = args.bettor || undefined;

  if (!betType || !selection || isNaN(stake)) {
    console.error('❌ 用法: add-bet --match <matchId> --type <1X2|handicap|over_under|correct_score|custom> --selection <选项> --stake <金额> [--odds <赔率>] [--bettor <名字>]');
    console.error('   示例: add-bet --match match_1 --type 1X2 --selection 墨西哥 --stake 100');
    console.error('   或:   add-bet --match "韩国 vs 捷克" --type 1X2 --selection 韩国 --stake 100');
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
    console.error('❌ 用法: add-bet --match <matchId> --type <玩法> --selection <选项> --stake <金额>');
    console.error('   示例: add-bet --match match_1 --type 1X2 --selection 墨西哥 --stake 100');
    process.exit(1);
  }

  const match = findMatchById(matches, matchId);
  if (!match) {
    console.error(`❌ 找不到比赛: ${matchId}`);
    process.exit(1);
  }

  // 如果没有提供赔率，尝试从 API 自动获取
  if (isNaN(odds) || odds === 0) {
    console.log('🔄 正在获取赔率...');
    const apiOdds = await getMatchOdds(match);
    if (apiOdds) {
      // 根据选择确定赔率
      const selectionLower = selection.toLowerCase();
      if (selectionLower === 'draw' || selectionLower === '平' || selectionLower === '平局') {
        odds = apiOdds.draw;
      } else if (selectionLower === match.teamA.toLowerCase() || selectionLower === '1' || selectionLower === '主') {
        odds = apiOdds.home;
      } else if (selectionLower === match.teamB.toLowerCase() || selectionLower === '2' || selectionLower === '客') {
        odds = apiOdds.away;
      } else {
        odds = apiOdds.home; // 默认使用主队赔率
      }
      console.log(`✅ 已获取赔率: ${odds}`);
    } else {
      // API 获取失败，使用 ELO 估算
      const { analyzeMatch } = require('../lib/eloRating');
      const eloMatch = analyzeMatch(match.teamA, match.teamB);
      const selectionLower = selection.toLowerCase();
      if (selectionLower === 'draw' || selectionLower === '平' || selectionLower === '平局') {
        odds = eloMatch.estimatedOdds.draw;
      } else if (selectionLower === match.teamA.toLowerCase() || selectionLower === '1' || selectionLower === '主') {
        odds = eloMatch.estimatedOdds.home;
      } else if (selectionLower === match.teamB.toLowerCase() || selectionLower === '2' || selectionLower === '客') {
        odds = eloMatch.estimatedOdds.away;
      } else {
        odds = eloMatch.estimatedOdds.home;
      }
      console.log(`✅ 使用ELO估算赔率: ${odds}`);
    }
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
