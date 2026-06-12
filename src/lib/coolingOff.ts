/**
 * WC26 冷静期检测模块
 *
 * 职责：检测用户是否冲动投注，提供冷静期建议。
 */

import { readBets } from './storage';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CoolingOffAlert {
  triggered: boolean;
  reason: string;
  timeSinceLastBet: number; // 分钟
  betCount: number;
  message: string;
  recommendation: string;
}

// ─── Detection Functions ────────────────────────────────────────────────────

/**
 * 检测是否需要冷静期
 */
export function detectCoolingOff(): CoolingOffAlert {
  const bets = readBets();
  
  if (bets.length === 0) {
    return {
      triggered: false,
      reason: 'no_bets',
      timeSinceLastBet: 0,
      betCount: 0,
      message: '',
      recommendation: '',
    };
  }
  
  // 按时间排序
  const sortedBets = [...bets].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  const lastBet = sortedBets[0];
  const lastBetTime = new Date(lastBet.createdAt).getTime();
  const now = Date.now();
  const timeSinceLastBet = (now - lastBetTime) / (1000 * 60); // 分钟
  
  // 检查最近 5 分钟内是否有下注
  if (timeSinceLastBet < 5) {
    return {
      triggered: true,
      reason: 'recent_bet',
      timeSinceLastBet: Math.round(timeSinceLastBet),
      betCount: bets.length,
      message: '⏸️ 你刚下了一注，建议等一等',
      recommendation: '等待至少 5 分钟再决定下一注，避免冲动',
    };
  }
  
  // 检查是否连续下注（最近 30 分钟内 3 注以上）
  const thirtyMinutesAgo = now - 30 * 60 * 1000;
  const recentBets = bets.filter(b => 
    new Date(b.createdAt).getTime() > thirtyMinutesAgo
  );
  
  if (recentBets.length >= 3) {
    return {
      triggered: true,
      reason: 'frequent_betting',
      timeSinceLastBet: Math.round(timeSinceLastBet),
      betCount: recentBets.length,
      message: '⏸️ 最近 30 分钟下了多注',
      recommendation: '频繁下注容易冲动，建议休息一下',
    };
  }
  
  // 检查深夜下注（23:00 - 06:00）
  const hour = new Date().getHours();
  if ((hour >= 23 || hour < 6) && timeSinceLastBet < 60) {
    return {
      triggered: true,
      reason: 'late_night',
      timeSinceLastBet: Math.round(timeSinceLastBet),
      betCount: bets.length,
      message: '⏸️ 现在是深夜，容易冲动',
      recommendation: '深夜容易冲动，建议明天再决定',
    };
  }
  
  return {
    triggered: false,
    reason: 'normal',
    timeSinceLastBet: Math.round(timeSinceLastBet),
    betCount: bets.length,
    message: '',
    recommendation: '',
  };
}

/**
 * 生成冷静期提示
 */
export function formatCoolingOffAlert(alert: CoolingOffAlert): string {
  if (!alert.triggered) return '';
  
  const lines: string[] = [];
  lines.push('\n⏸️ 冷静期提醒');
  lines.push(`${'─'.repeat(40)}`);
  lines.push(`${alert.message}`);
  lines.push(`   距离上一注: ${alert.timeSinceLastBet} 分钟`);
  lines.push(`   💡 ${alert.recommendation}`);
  
  return lines.join('\n');
}
