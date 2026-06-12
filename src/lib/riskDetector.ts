/**
 * WC26 风险检测模块
 *
 * 职责：检测用户投注行为异常，提供风险预警。
 */

import { readBets } from './storage';
import { Bet } from '../types';
import fs from 'fs';
import path from 'path';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RiskAlert {
  type: 'high_stake' | 'chasing_loss' | 'frequent_betting' | 'high_odds_only';
  severity: 'high' | 'medium' | 'low';
  message: string;
  details: string;
  recommendation: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadConfig(): { initialDeposit: number } {
  const configPath = path.join(process.cwd(), 'data', 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {}
  return { initialDeposit: 1000 };
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RiskAlert {
  type: 'high_stake' | 'chasing_loss' | 'frequent_betting' | 'high_odds_only';
  severity: 'high' | 'medium' | 'low';
  message: string;
  details: string;
  recommendation: string;
}

// ─── Detection Functions ────────────────────────────────────────────────────

/**
 * 检测单注金额过大
 */
export function detectHighStake(stake: number): RiskAlert | null {
  const config = loadConfig();
  const balance = config.initialDeposit || 1000;
  const percentage = (stake / balance) * 100;
  
  if (percentage > 30) {
    return {
      type: 'high_stake',
      severity: 'high',
      message: '⚠️ 单注金额过大！',
      details: `这注 ${stake} 元占你本金的 ${percentage.toFixed(1)}%`,
      recommendation: '建议单注不超过本金的 20%，分散风险',
    };
  }
  
  if (percentage > 20) {
    return {
      type: 'high_stake',
      severity: 'medium',
      message: '💡 单注金额较高',
      details: `这注 ${stake} 元占你本金的 ${percentage.toFixed(1)}%`,
      recommendation: '建议控制在 20% 以内',
    };
  }
  
  return null;
}

/**
 * 检测连败后追注
 */
export function detectChasingLoss(): RiskAlert | null {
  const bets = readBets();
  const recentBets = bets
    .filter(b => b.status === 'lost')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  
  if (recentBets.length >= 3) {
    const totalLost = recentBets.reduce((sum, b) => sum + b.stake, 0);
    return {
      type: 'chasing_loss',
      severity: 'high',
      message: '🚨 检测到连败追注！',
      details: `最近 ${recentBets.length} 场连续亏损，共亏 ${totalLost} 元`,
      recommendation: '连败时建议暂停投注，冷静分析原因，不要急于翻本',
    };
  }
  
  if (recentBets.length >= 2) {
    return {
      type: 'chasing_loss',
      severity: 'medium',
      message: '⚠️ 连败警告',
      details: `最近 ${recentBets.length} 场亏损`,
      recommendation: '建议减少投注金额或暂停一下',
    };
  }
  
  return null;
}

/**
 * 检测频繁下注
 */
export function detectFrequentBetting(): RiskAlert | null {
  const bets = readBets();
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  const recentBets = bets.filter(b => 
    new Date(b.createdAt).getTime() > oneHourAgo
  );
  
  if (recentBets.length >= 5) {
    return {
      type: 'frequent_betting',
      severity: 'high',
      message: '🚨 频繁下注警告！',
      details: `过去 1 小时内下了 ${recentBets.length} 注`,
      recommendation: '频繁下注容易冲动，建议休息 30 分钟后再决定',
    };
  }
  
  if (recentBets.length >= 3) {
    return {
      type: 'frequent_betting',
      severity: 'medium',
      message: '💡 下注频率较高',
      details: `过去 1 小时内下了 ${recentBets.length} 注`,
      recommendation: '注意控制下注节奏',
    };
  }
  
  return null;
}

/**
 * 检测只玩高赔率
 */
export function detectHighOddsOnly(odds: number): RiskAlert | null {
  if (odds > 10) {
    return {
      type: 'high_odds_only',
      severity: 'medium',
      message: '⚠️ 高赔率投注',
      details: `赔率 ${odds} 意味着隐含胜率只有 ${(100/odds).toFixed(1)}%`,
      recommendation: '高赔率=低概率，适合作为娱乐，不建议大额投入',
    };
  }
  
  return null;
}

/**
 * 检测所有风险
 */
export function detectAllRisks(stake: number, odds: number): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  
  const highStake = detectHighStake(stake);
  if (highStake) alerts.push(highStake);
  
  const chasingLoss = detectChasingLoss();
  if (chasingLoss) alerts.push(chasingLoss);
  
  const frequentBetting = detectFrequentBetting();
  if (frequentBetting) alerts.push(frequentBetting);
  
  const highOdds = detectHighOddsOnly(odds);
  if (highOdds) alerts.push(highOdds);
  
  return alerts;
}

// ─── Formatting ─────────────────────────────────────────────────────────────

export function formatRiskAlerts(alerts: RiskAlert[]): string {
  if (alerts.length === 0) return '';
  
  const lines: string[] = [];
  lines.push('\n⚠️ 风险预警');
  lines.push(`${'─'.repeat(40)}`);
  
  for (const alert of alerts) {
    const severityEmoji = alert.severity === 'high' ? '🔴' : 
                          alert.severity === 'medium' ? '🟡' : '🟢';
    lines.push(`${severityEmoji} ${alert.message}`);
    lines.push(`   ${alert.details}`);
    lines.push(`   💡 ${alert.recommendation}`);
    lines.push('');
  }
  
  return lines.join('\n');
}
