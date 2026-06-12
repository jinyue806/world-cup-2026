/**
 * WC26 连胜/连败检测模块
 *
 * 职责：检测用户的连胜/连败趋势，提供通知和分析。
 */

import { readBets } from './storage';
import { Bet, BetStatus } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StreakInfo {
  type: 'win' | 'loss';
  count: number;
  startDate: string;
  endDate: string;
  totalProfit: number;
  bets: string[]; // 注单 ID 列表
}

export interface StreakAnalysis {
  currentStreak: StreakInfo | null;
  longestWinStreak: number;
  longestLossStreak: number;
  totalWinStreaks: number;
  totalLossStreaks: number;
  averageStreakLength: number;
}

export interface StreakNotification {
  type: 'win_streak' | 'loss_streak' | 'record_streak';
  message: string;
  streak: StreakInfo;
  timestamp: string;
}

// ─── Core Detection ─────────────────────────────────────────────────────────

/**
 * 分析所有连胜/连败
 */
export function analyzeStreaks(bets: Bet[]): StreakAnalysis {
  const settled = bets
    .filter(b => b.status === 'won' || b.status === 'lost')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (settled.length === 0) {
    return {
      currentStreak: null,
      longestWinStreak: 0,
      longestLossStreak: 0,
      totalWinStreaks: 0,
      totalLossStreaks: 0,
      averageStreakLength: 0,
    };
  }

  const streaks: StreakInfo[] = [];
  let currentType: 'win' | 'loss' = settled[0].status === 'won' ? 'win' : 'loss';
  let currentCount = 1;
  let currentStart = settled[0].createdAt;
  let currentProfit = calcBetProfit(settled[0]);
  let currentBets = [settled[0].id];

  for (let i = 1; i < settled.length; i++) {
    const bet = settled[i];
    const thisType = bet.status === 'won' ? 'win' : 'loss';

    if (thisType === currentType) {
      currentCount++;
      currentProfit += calcBetProfit(bet);
      currentBets.push(bet.id);
    } else {
      streaks.push({
        type: currentType,
        count: currentCount,
        startDate: currentStart,
        endDate: settled[i - 1].createdAt,
        totalProfit: currentProfit,
        bets: currentBets,
      });
      currentType = thisType;
      currentCount = 1;
      currentStart = bet.createdAt;
      currentProfit = calcBetProfit(bet);
      currentBets = [bet.id];
    }
  }

  // 添加最后一个 streak
  streaks.push({
    type: currentType,
    count: currentCount,
    startDate: currentStart,
    endDate: settled[settled.length - 1].createdAt,
    totalProfit: currentProfit,
    bets: currentBets,
  });

  const winStreaks = streaks.filter(s => s.type === 'win');
  const lossStreaks = streaks.filter(s => s.type === 'loss');
  const longestWin = Math.max(0, ...winStreaks.map(s => s.count));
  const longestLoss = Math.max(0, ...lossStreaks.map(s => s.count));

  const currentStreak = streaks[streaks.length - 1];
  const totalLength = streaks.reduce((sum, s) => sum + s.count, 0);

  return {
    currentStreak: currentStreak.count > 0 ? currentStreak : null,
    longestWinStreak: longestWin,
    longestLossStreak: longestLoss,
    totalWinStreaks: winStreaks.length,
    totalLossStreaks: lossStreaks.length,
    averageStreakLength: streaks.length > 0 ? totalLength / streaks.length : 0,
  };
}

/**
 * 检测是否有需要通知的连胜/连败
 */
export function detectStreakNotifications(bets: Bet[]): StreakNotification[] {
  const analysis = analyzeStreaks(bets);
  const notifications: StreakNotification[] = [];

  if (!analysis.currentStreak) return notifications;

  const streak = analysis.currentStreak;

  // 连胜通知：3 连胜以上
  if (streak.type === 'win' && streak.count >= 3) {
    notifications.push({
      type: 'win_streak',
      message: `🔥 ${streak.count} 连胜！继续保持！`,
      streak,
      timestamp: new Date().toISOString(),
    });

    // 破纪录通知
    if (streak.count > analysis.longestWinStreak) {
      notifications.push({
        type: 'record_streak',
        message: `🏆 新纪录！${streak.count} 连胜超过之前的 ${analysis.longestWinStreak} 连胜！`,
        streak,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 连败通知：3 连败以上
  if (streak.type === 'loss' && streak.count >= 3) {
    notifications.push({
      type: 'loss_streak',
      message: `❄️ ${streak.count} 连败，注意控制投注！`,
      streak,
      timestamp: new Date().toISOString(),
    });

    // 破纪录通知
    if (streak.count > analysis.longestLossStreak) {
      notifications.push({
        type: 'record_streak',
        message: `⚠️ 新纪录！${streak.count} 连败超过之前的 ${analysis.longestLossStreak} 连败！`,
        streak,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return notifications;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function calcBetProfit(bet: Bet): number {
  if (bet.status === 'won') return bet.stake * (bet.odds - 1);
  if (bet.status === 'lost') return -bet.stake;
  return 0;
}

// ─── Formatting ─────────────────────────────────────────────────────────────

export function formatStreakAnalysis(analysis: StreakAnalysis): string {
  const lines: string[] = [];

  lines.push('\n📊 连胜/连败分析');
  lines.push(`${'─'.repeat(50)}`);

  if (analysis.currentStreak) {
    const s = analysis.currentStreak;
    const emoji = s.type === 'win' ? '🔥' : '❄️';
    const sign = s.totalProfit >= 0 ? '+' : '';
    lines.push(`${emoji} 当前${s.type === 'win' ? '连胜' : '连败'}: ${s.count} 场`);
    lines.push(`   时间: ${s.startDate.slice(0, 10)} ~ ${s.endDate.slice(0, 10)}`);
    lines.push(`   累计收益: ${sign}${s.totalProfit.toFixed(2)}`);
  } else {
    lines.push('   暂无连胜/连败记录');
  }

  lines.push('');
  lines.push(`   最长连胜: ${analysis.longestWinStreak} 场`);
  lines.push(`   最长连败: ${analysis.longestLossStreak} 场`);
  lines.push(`   总连胜次数: ${analysis.totalWinStreaks}`);
  lines.push(`   总连败次数: ${analysis.totalLossStreaks}`);
  lines.push(`   平均连胜长度: ${analysis.averageStreakLength.toFixed(1)} 场`);

  return lines.join('\n');
}

export function formatStreakNotifications(notifications: StreakNotification[]): string {
  if (notifications.length === 0) return '';

  const lines: string[] = [];
  lines.push('\n🔔 连胜/连败通知');
  lines.push(`${'─'.repeat(50)}`);

  for (const n of notifications) {
    lines.push(`  ${n.message}`);
  }

  return lines.join('\n');
}
