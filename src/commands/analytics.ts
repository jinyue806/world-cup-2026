/**
 * WC26 数据分析命令
 *
 * 职责：展示多日盈亏分析、投注趋势。
 */
import { readBets } from '../lib/storage';
import { generateAnalytics, printAnalytics } from '../lib/analytics';

/**
 * cmdAnalytics - 数据分析
 *
 * 用法:
 *   analytics              完整分析报告
 *   analytics --days 7     最近 N 天
 *   analytics --type 1X2   按玩法筛选
 */
export function cmdAnalytics(args: Record<string, string>): void {
  let bets = readBets();

  // 按玩法筛选
  if (args.type) {
    bets = bets.filter(b => b.betType === args.type);
  }

  // 按天数筛选
  if (args.days) {
    const days = parseInt(args.days);
    if (!isNaN(days) && days > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      bets = bets.filter(b => new Date(b.createdAt) >= cutoff);
    }
  }

  if (bets.length === 0) {
    console.log('📭 没有投注数据');
    return;
  }

  const summary = generateAnalytics(bets);
  printAnalytics(summary);
}
