import { readMatches, readBets, readPredictions, writePredictions } from '../lib/storage';
import { calcAccount } from '../lib/settler';
import { calcGroupStandings } from '../lib/groupStandings';
import { teamZhName } from '../lib/parser';
import { fetchStandings } from '../lib/worldcupApi';
import { loadConfig } from './helpers';

export function cmdQuery(args: Record<string, string> = {}) {
  let bets = readBets();
  const config = loadConfig();
  
  // 按投注人筛选
  const bettorFilter = args.bettor;
  if (bettorFilter) {
    bets = bets.filter(b => b.bettorId === bettorFilter);
  }
  
  const account = calcAccount(bets, config.initialDeposit);

  const settledBets = bets.filter(b => b.status !== 'pending');
  const totalInvestment = settledBets.reduce((acc, b) => acc + b.stake, 0);
  const totalReturn = settledBets.filter(b => b.status === 'won').reduce((acc, b) => acc + b.stake * b.odds, 0)
    + settledBets.filter(b => b.status === 'void').reduce((acc, b) => acc + b.stake, 0);
  const roi = totalInvestment > 0 ? (account.netPnl / totalInvestment * 100) : null;

  console.log(`\n💰 盈亏统计`);
  console.log(`   初始金额: ${config.initialDeposit}`);
  console.log(`   净收益: ${account.netPnl >= 0 ? '+' : ''}${account.netPnl.toFixed(2)}`);
  console.log(`   当前余额: ${account.balance.toFixed(2)}`);
  console.log(`   总投入: ${totalInvestment.toFixed(2)}`);
  console.log(`   总回报: ${totalReturn.toFixed(2)}`);
  console.log(`   收益率: ${roi !== null ? `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%` : 'N/A（无已结算注单）'}`);
  console.log(`   待结算金额: ${account.pendingStake.toFixed(2)}`);
  console.log(`   总赢利: +${account.totalWon.toFixed(2)}`);
  console.log(`   总亏损: -${account.totalLost.toFixed(2)}`);
  console.log(`   走盘: ${account.totalVoid}`);
  console.log(`   胜率: ${(account.winRate * 100).toFixed(1)}%`);
  console.log(`   总注数: ${account.betCount}`);
}

export function cmdListBets(args: Record<string, string>) {
  const bets = readBets();
  const matches = readMatches();
  const statusFilter = args.status;
  const bettorFilter = args.bettor;

  let filtered = bets;
  if (statusFilter) {
    filtered = filtered.filter(b => b.status === statusFilter);
  }
  if (bettorFilter) {
    filtered = filtered.filter(b => b.bettorId === bettorFilter);
  }

  if (filtered.length === 0) {
    console.log('ℹ️  没有找到注单');
    return;
  }

  console.log(`\n📝 注单列表 (${filtered.length} 注)`);
  for (const b of filtered) {
    const match = matches.find(m => m.id === b.matchId);
    const matchDesc = match
      ? `${teamZhName(match.teamA)} vs ${teamZhName(match.teamB)} (${match.group})`
      : b.matchId;
    const emoji = b.status === 'won' ? '🟢' : b.status === 'lost' ? '🔴' : b.status === 'void' ? '⚪' : '🟡';
    const pnl = b.status === 'won' ? `+${(b.stake * (b.odds - 1)).toFixed(2)}` : b.status === 'lost' ? `-${b.stake.toFixed(2)}` : '';
    console.log(`  ${emoji} [${b.id}] ${matchDesc}`);
    console.log(`     ${b.betType} | ${b.betSelection} | 赔率 ${b.odds} | 金额 ${b.stake} | ${b.status} ${pnl}`);
  }
}

export function cmdStandings(args: Record<string, string>) {
  const group = args.group;
  if (!group) {
    console.error('❌ 用法: standings --group <Group A>');
    process.exit(1);
  }

  const matches = readMatches();
  const groupMatches = matches.filter(m => m.group === group);
  if (groupMatches.length === 0) {
    console.error(`❌ 找不到分组: ${group}`);
    return;
  }

  const teams = [...new Set(groupMatches.flatMap(m => [m.teamA, m.teamB]))];
  const rows = calcGroupStandings(teams, groupMatches);

  const hasStarted = groupMatches.some(m => m.status === 'finished');

  console.log(`\n📊 ${group} 积分榜`);
  if (!hasStarted) {
    console.log('  （比赛尚未开始）\n');
  }

  const header = `  ${'#'.padStart(2)}  ${'队名'.padEnd(18)} ${'场'.padStart(2)} ${'胜'.padStart(2)} ${'平'.padStart(2)} ${'负'.padStart(2)} ${'净胜'.padStart(4)} ${'积分'.padStart(4)}`;
  console.log(header);
  console.log('  ' + '─'.repeat(48));

  rows.forEach((row, idx) => {
    const rank = String(idx + 1).padStart(2);
    const name = teamZhName(row.team).padEnd(16);
    const played = String(row.played).padStart(2);
    const won = String(row.won).padStart(2);
    const drawn = String(row.drawn).padStart(2);
    const lost = String(row.lost).padStart(2);
    const gd = row.gd >= 0 ? `+${row.gd}`.padStart(4) : String(row.gd).padStart(4);
    const pts = String(row.pts).padStart(4);
    const tag = idx < 2 ? ' ✅' : '';
    console.log(`  ${rank}  ${name} ${played} ${won} ${drawn} ${lost} ${gd} ${pts}${tag}`);
  });
}

export async function cmdFetchStandings() {
  console.log('🔍 正在从 API 获取积分榜...');
  let data: Record<string, any[]>;
  try {
    data = await fetchStandings();
  } catch (e) {
    console.error(`❌ 获取失败: ${(e as Error).message}`);
    process.exit(1);
  }

  const predictions = readPredictions();
  let updated = 0;

  for (const [groupKey, teams] of Object.entries(data!)) {
    if (!groupKey || groupKey === '') continue;
    const groupName = `Group ${groupKey}`;
    const sorted = teams
      .map(t => ({
        name: t.teamName,
        pts: Number(t.points) || 0,
        gd: (Number(t.goals) || 0) - (Number(t.goalsAgainst) || 0),
      }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd)
      .map(t => t.name);

    if (sorted.length > 0) {
      predictions.groupStandings[groupName] = sorted;
      updated++;
    }
  }

  predictions.lastFetchAt = Date.now();
  writePredictions(predictions);
  console.log(`✅ 已同步 ${updated} 个小组的积分榜`);
  for (const [group, teams] of Object.entries(predictions.groupStandings)) {
    console.log(`   ${group}: ${teams.join(' > ')}`);
  }
}
