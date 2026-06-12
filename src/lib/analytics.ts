/**
 * WC26 数据分析模块
 *
 * 职责：多日盈亏分析、投注趋势、胜率统计。
 */
import { Bet, BetStatus } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DailyStats {
  date: string;
  bets: number;
  won: number;
  lost: number;
  voided: number;
  pending: number;
  stake: number;
  return: number;
  profit: number;
  roi: number;
}

export interface BetTypeStats {
  type: string;
  bets: number;
  won: number;
  lost: number;
  stake: number;
  return: number;
  profit: number;
  winRate: number;
  roi: number;
}

export interface StreakInfo {
  type: 'win' | 'loss';
  count: number;
  startDate: string;
  endDate: string;
}

export interface AnalyticsSummary {
  totalBets: number;
  totalStake: number;
  totalReturn: number;
  totalProfit: number;
  overallRoi: number;
  winRate: number;
  bestDay: DailyStats | null;
  worstDay: DailyStats | null;
  currentStreak: StreakInfo | null;
  longestWinStreak: number;
  longestLossStreak: number;
  byType: BetTypeStats[];
  byDay: DailyStats[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

function calcBetProfit(bet: Bet): number {
  if (bet.status === 'won') return bet.stake * (bet.odds - 1);
  if (bet.status === 'lost') return -bet.stake;
  return 0;
}

function calcBetReturn(bet: Bet): number {
  if (bet.status === 'won') return bet.stake * bet.odds;
  return 0;
}

// ─── Core Analysis ──────────────────────────────────────────────────────────

/**
 * 按日期分组统计
 */
export function analyzeByDay(bets: Bet[]): DailyStats[] {
  const dayMap = new Map<string, Bet[]>();

  for (const bet of bets) {
    const day = formatDate(bet.createdAt);
    const list = dayMap.get(day) || [];
    list.push(bet);
    dayMap.set(day, list);
  }

  const stats: DailyStats[] = [];
  for (const [date, dayBets] of dayMap) {
    const settled = dayBets.filter(b => b.status !== 'pending');
    const won = dayBets.filter(b => b.status === 'won').length;
    const lost = dayBets.filter(b => b.status === 'lost').length;
    const voided = dayBets.filter(b => b.status === 'void').length;
    const pending = dayBets.filter(b => b.status === 'pending').length;
    const stake = dayBets.reduce((s, b) => s + b.stake, 0);
    const ret = dayBets.reduce((s, b) => s + calcBetReturn(b), 0);
    const profit = dayBets.reduce((s, b) => s + calcBetProfit(b), 0);

    stats.push({
      date,
      bets: dayBets.length,
      won,
      lost,
      voided,
      pending,
      stake,
      return: ret,
      profit,
      roi: stake > 0 ? (profit / stake) * 100 : 0,
    });
  }

  return stats.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 按投注类型统计
 */
export function analyzeByType(bets: Bet[]): BetTypeStats[] {
  const typeMap = new Map<string, Bet[]>();

  for (const bet of bets) {
    const list = typeMap.get(bet.betType) || [];
    list.push(bet);
    typeMap.set(bet.betType, list);
  }

  const stats: BetTypeStats[] = [];
  for (const [type, typeBets] of typeMap) {
    const settled = typeBets.filter(b => b.status !== 'pending');
    const won = typeBets.filter(b => b.status === 'won').length;
    const lost = typeBets.filter(b => b.status === 'lost').length;
    const stake = typeBets.reduce((s, b) => s + b.stake, 0);
    const ret = typeBets.reduce((s, b) => s + calcBetReturn(b), 0);
    const profit = typeBets.reduce((s, b) => s + calcBetProfit(b), 0);

    stats.push({
      type,
      bets: typeBets.length,
      won,
      lost,
      stake,
      return: ret,
      profit,
      winRate: settled.length > 0 ? (won / settled.length) * 100 : 0,
      roi: stake > 0 ? (profit / stake) * 100 : 0,
    });
  }

  return stats.sort((a, b) => b.bets - a.bets);
}

/**
 * 分析连胜/连败
 */
export function analyzeStreaks(bets: Bet[]): {
  current: StreakInfo | null;
  longestWin: number;
  longestLoss: number;
} {
  const settled = bets
    .filter(b => b.status === 'won' || b.status === 'lost')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (settled.length === 0) {
    return { current: null, longestWin: 0, longestLoss: 0 };
  }

  let longestWin = 0;
  let longestLoss = 0;
  let curType: 'win' | 'loss' = settled[0].status === 'won' ? 'win' : 'loss';
  let curCount = 1;
  let curStart = formatDate(settled[0].createdAt);

  for (let i = 1; i < settled.length; i++) {
    const thisType = settled[i].status === 'won' ? 'win' : 'loss';
    if (thisType === curType) {
      curCount++;
    } else {
      if (curType === 'win') longestWin = Math.max(longestWin, curCount);
      else longestLoss = Math.max(longestLoss, curCount);
      curType = thisType;
      curCount = 1;
      curStart = formatDate(settled[i].createdAt);
    }
  }
  if (curType === 'win') longestWin = Math.max(longestWin, curCount);
  else longestLoss = Math.max(longestLoss, curCount);

  // 当前连胜/连败
  const current: StreakInfo = {
    type: curType,
    count: curCount,
    startDate: curStart,
    endDate: formatDate(settled[settled.length - 1].createdAt),
  };

  return { current, longestWin, longestLoss };
}

/**
 * 生成完整分析报告
 */
export function generateAnalytics(bets: Bet[]): AnalyticsSummary {
  const byDay = analyzeByDay(bets);
  const byType = analyzeByType(bets);
  const { current, longestWin, longestLoss } = analyzeStreaks(bets);

  const settled = bets.filter(b => b.status !== 'pending');
  const totalStake = bets.reduce((s, b) => s + b.stake, 0);
  const totalReturn = bets.reduce((s, b) => s + calcBetReturn(b), 0);
  const totalProfit = bets.reduce((s, b) => s + calcBetProfit(b), 0);

  const bestDay = byDay.length > 0
    ? byDay.reduce((best, d) => d.profit > best.profit ? d : best, byDay[0])
    : null;
  const worstDay = byDay.length > 0
    ? byDay.reduce((worst, d) => d.profit < worst.profit ? d : worst, byDay[0])
    : null;

  return {
    totalBets: bets.length,
    totalStake,
    totalReturn: totalReturn,
    totalProfit,
    overallRoi: totalStake > 0 ? (totalProfit / totalStake) * 100 : 0,
    winRate: settled.length > 0 ? (settled.filter(b => b.status === 'won').length / settled.length) * 100 : 0,
    bestDay,
    worstDay,
    currentStreak: current,
    longestWinStreak: longestWin,
    longestLossStreak: longestLoss,
    byType,
    byDay,
  };
}

// ─── Formatting ─────────────────────────────────────────────────────────────

function formatProfit(p: number): string {
  const sign = p >= 0 ? '+' : '';
  return `${sign}${p.toFixed(2)}`;
}

function formatRoi(roi: number): string {
  const sign = roi >= 0 ? '+' : '';
  return `${sign}${roi.toFixed(1)}%`;
}

/**
 * 打印完整分析报告
 */
export function printAnalytics(summary: AnalyticsSummary): void {
  console.log(`\n📊 数据分析报告`);
  console.log(`${'─'.repeat(50)}`);

  // 总览
  console.log(`\n💰 总览`);
  console.log(`   总注数: ${summary.totalBets} | 已结算: ${summary.totalBets - summary.byDay.reduce((s, d) => s + d.pending, 0)}`);
  console.log(`   总投入: ${summary.totalStake} | 总回报: ${summary.totalReturn.toFixed(2)}`);
  console.log(`   净收益: ${formatProfit(summary.totalProfit)} | 收益率: ${formatRoi(summary.overallRoi)}`);
  console.log(`   胜率: ${summary.winRate.toFixed(1)}%`);

  // 连胜/连败
  if (summary.currentStreak) {
    const s = summary.currentStreak;
    const emoji = s.type === 'win' ? '🔥' : '❄️';
    console.log(`\n${emoji} 当前${s.type === 'win' ? '连胜' : '连败'}: ${s.count} 场 (${s.startDate} ~ ${s.endDate})`);
  }
  console.log(`   最长连胜: ${summary.longestWinStreak} 场 | 最长连败: ${summary.longestLossStreak} 场`);

  // 最佳/最差日
  if (summary.bestDay && summary.bestDay.profit > 0) {
    console.log(`\n🏆 最佳日: ${summary.bestDay.date} (${formatProfit(summary.bestDay.profit)}, ${summary.bestDay.won}赢/${summary.bestDay.lost}输)`);
  }
  if (summary.worstDay && summary.worstDay.profit < 0) {
    console.log(`💀 最差日: ${summary.worstDay.date} (${formatProfit(summary.worstDay.profit)}, ${summary.worstDay.won}赢/${summary.worstDay.lost}输)`);
  }

  // 按类型统计
  if (summary.byType.length > 0) {
    console.log(`\n📈 按玩法统计`);
    console.log(`   ${'玩法'.padEnd(12)} ${'注数'.padEnd(6)} ${'胜率'.padEnd(8)} ${'投入'.padEnd(8)} ${'收益'.padEnd(10)} ${'收益率'.padEnd(8)}`);
    console.log(`   ${'─'.repeat(52)}`);
    for (const t of summary.byType) {
      console.log(
        `   ${t.type.padEnd(12)} ${String(t.bets).padEnd(6)} ${t.winRate.toFixed(0).padStart(4)}%   ${String(t.stake).padEnd(8)} ${formatProfit(t.profit).padEnd(10)} ${formatRoi(t.roi).padEnd(8)}`
      );
    }
  }

  // 每日趋势（最近 7 天）
  const recentDays = summary.byDay.slice(-7);
  if (recentDays.length > 0) {
    console.log(`\n📅 每日趋势 (最近 ${recentDays.length} 天)`);
    console.log(`   ${'日期'.padEnd(12)} ${'注数'.padEnd(6)} ${'胜/负'.padEnd(8)} ${'投入'.padEnd(8)} ${'收益'.padEnd(10)} ${'收益率'.padEnd(8)}`);
    console.log(`   ${'─'.repeat(52)}`);
    for (const d of recentDays) {
      console.log(
        `   ${d.date.padEnd(12)} ${String(d.bets).padEnd(6)} ${(d.won + '/' + d.lost).padEnd(8)} ${String(d.stake).padEnd(8)} ${formatProfit(d.profit).padEnd(10)} ${formatRoi(d.roi).padEnd(8)}`
      );
    }

    // 累计收益曲线
    let cumulative = 0;
    console.log(`\n   累计收益曲线:`);
    for (const d of recentDays) {
      cumulative += d.profit;
      const bar = cumulative >= 0
        ? '█'.repeat(Math.min(Math.abs(cumulative) / 10, 20))
        : '░'.repeat(Math.min(Math.abs(cumulative) / 10, 20));
      const label = cumulative >= 0 ? `+${cumulative.toFixed(0)}` : cumulative.toFixed(0);
      console.log(`   ${d.date.slice(5)} ${bar} ${label}`);
    }
  }
}
