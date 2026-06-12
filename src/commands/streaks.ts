/**
 * WC26 连胜/连败查询命令
 *
 * 职责：显示用户的连胜/连败统计和通知。
 */
import { readBets } from '../lib/storage';
import { analyzeStreaks, detectStreakNotifications, formatStreakAnalysis, formatStreakNotifications } from '../lib/streakDetector';

/**
 * cmdStreaks - 连胜/连败查询
 *
 * 用法:
 *   streaks                   显示连胜/连败统计
 *   streaks --notify          显示需要通知的连胜/连败
 */
export function cmdStreaks(args: Record<string, string>): void {
  const bets = readBets();

  if (args.notify === 'true') {
    const notifications = detectStreakNotifications(bets);
    if (notifications.length === 0) {
      console.log('ℹ️  暂无需要通知的连胜/连败');
      return;
    }
    console.log(formatStreakNotifications(notifications));
  } else {
    const analysis = analyzeStreaks(bets);
    console.log(formatStreakAnalysis(analysis));
  }
}
