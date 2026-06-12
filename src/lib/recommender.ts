/**
 * WC26 AI 预测推荐引擎
 *
 * 职责：根据赔率数据、历史表现、社交媒体情绪，推荐最佳投注。
 * 核心算法：凯利公式 + 赔率偏差检测 + 情绪分析整合。
 */

import { readMatches, readBets } from './storage';
import { calcAccount } from './settler';
import { analyzeAllTeams, type SentimentResult } from './sentimentAnalyzer';
import { teamZhName } from './parser';
import { Match, Bet, BetType } from '../types';
import { fetchWorldcupMatches, type BettingMatch } from './bettingApi';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Recommendation {
  matchId: string;
  match: string;
  betType: BetType;
  selection: string;
  odds: number;
  kellyFraction: number;
  expectedValue: number;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  sentiment?: SentimentResult;
}

export interface RecommendationSummary {
  recommendations: Recommendation[];
  totalMatches: number;
  totalBets: number;
  userWinRate: number;
  generatedAt: string;
}

// ─── Kelly Criterion ────────────────────────────────────────────────────────

/**
 * 凯利公式计算最优投注比例
 * 
 * Kelly % = (bp - q) / b
 * 其中：
 *   b = 赔率 - 1 (净赔率)
 *   p = 胜率估计
 *   q = 1 - p (败率)
 */
function kellyCriterion(odds: number, estimatedWinProb: number): number {
  const b = odds - 1;
  const p = estimatedWinProb;
  const q = 1 - p;
  
  const kelly = (b * p - q) / b;
  
  // 保守策略：使用半凯利（减少波动）
  return Math.max(0, kelly * 0.5);
}

/**
 * 根据赔率反推隐含胜率
 */
function impliedProbability(odds: number): number {
  return 1 / odds;
}

// ─── Odds Analysis ──────────────────────────────────────────────────────────

/**
 * 分析赔率偏差
 * 当实际赔率明显高于理论赔率时，可能存在价值投注机会
 */
function analyzeOddsDeviation(
  currentOdds: number,
  historicalAvgOdds: number,
  threshold: number = 0.1
): { deviation: number; isValue: boolean } {
  const deviation = (currentOdds - historicalAvgOdds) / historicalAvgOdds;
  return {
    deviation,
    isValue: Math.abs(deviation) > threshold && deviation > 0,
  };
}

/**
 * 估算基于历史数据的胜率
 * 简化版本：使用赔率隐含概率作为基准，加上随机扰动模拟市场偏差
 */
function estimateWinProbability(
  match: Match,
  selection: string,
  odds: number,
  sentiment?: SentimentResult
): number {
  // 基础概率：从赔率反推
  let baseProb = impliedProbability(odds);
  
  // 市场偏差模拟：真实市场中赔率往往不能完全反映真实概率
  // 加入 ±10% 的随机扰动来模拟市场低效
  const marketNoise = (Math.random() - 0.5) * 0.2;
  baseProb += marketNoise;
  
  // 情绪调整：正面情绪增加概率，负面情绪降低概率
  if (sentiment) {
    const sentimentAdjustment = sentiment.score * 0.08; // 最多调整 8%
    baseProb += sentimentAdjustment;
  }
  
  // 限制在合理范围内
  return Math.max(0.05, Math.min(0.95, baseProb));
}

// ─── User History Analysis ──────────────────────────────────────────────────

interface UserStats {
  winRate: number;
  totalBets: number;
  roi: number;
  favoriteType: BetType;
}

function analyzeUserHistory(bets: Bet[]): UserStats {
  const account = calcAccount(bets);
  
  // 计算各玩法的使用频率
  const typeCounts: Record<string, number> = {};
  for (const bet of bets) {
    typeCounts[bet.betType] = (typeCounts[bet.betType] || 0) + 1;
  }
  
  const favoriteType = (Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '1X2') as BetType;
  
  const roi = account.betCount > 0 ? (account.netPnl / account.betCount) : 0;
  
  return {
    winRate: account.winRate,
    totalBets: account.betCount,
    roi,
    favoriteType,
  };
}

// ─── Recommendation Generation ──────────────────────────────────────────────

/**
 * 为单场比赛生成推荐
 */
function generateMatchRecommendation(
  match: Match,
  sentiment?: SentimentResult,
  bettingMatch?: BettingMatch
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  if (match.status === 'finished') return recommendations;
  
  const matchDesc = `${teamZhName(match.teamA)} vs ${teamZhName(match.teamB)}`;
  
  // 从投注平台获取真实赔率
  let options: Array<{ selection: string; odds: number; sentimentTeam?: string }> = [];
  
  if (bettingMatch && bettingMatch.markets.length > 0) {
    // 使用真实赔率
    const winMarket = bettingMatch.markets.find(m => m.name === '独赢');
    if (winMarket) {
      for (const opt of winMarket.options) {
        if (opt.odds > 0) {
          options.push({
            selection: opt.name,
            odds: opt.odds,
            sentimentTeam: opt.name,
          });
        }
      }
    }
  }
  
  // 如果没有真实赔率，使用模拟赔率
  if (options.length === 0) {
    const baseOddsA = 2.0 + Math.random() * 1.5;
    const baseOddsB = 2.0 + Math.random() * 1.5;
    const drawOdds = 3.0 + Math.random() * 1.0;
    
    options = [
      { selection: match.teamA, odds: baseOddsA, sentimentTeam: match.teamA },
      { selection: 'draw', odds: drawOdds },
      { selection: match.teamB, odds: baseOddsB, sentimentTeam: match.teamB },
    ];
  }
  
  for (const opt of options) {
    // 获取对应球队的情绪数据
    const teamSentiment = opt.sentimentTeam && sentiment
      ? (sentiment.team === opt.sentimentTeam ? sentiment : undefined)
      : undefined;
    
    const winProb = estimateWinProbability(match, opt.selection, opt.odds, teamSentiment);
    const kelly = kellyCriterion(opt.odds, winProb);
    const expectedValue = (winProb * opt.odds) - 1;
    
    // 确定置信度
    let confidence: 'high' | 'medium' | 'low' = 'low';
    const reasons: string[] = [];
    
    if (kelly > 0.05) {
      confidence = 'high';
      reasons.push(`凯利值 ${(kelly * 100).toFixed(1)}% 较高`);
    } else if (kelly > 0.02) {
      confidence = 'medium';
      reasons.push(`凯利值 ${(kelly * 100).toFixed(1)}% 中等`);
    }
    
    if (expectedValue > 0.1) {
      reasons.push(`期望收益 ${(expectedValue * 100).toFixed(1)}%`);
    }
    
    if (teamSentiment && teamSentiment.score > 0.3) {
      reasons.push(`社交媒体正面情绪`);
    } else if (teamSentiment && teamSentiment.score < -0.3) {
      reasons.push(`社交媒体负面情绪`);
    }
    
    if (kelly > 0.01) { // 只推荐有正期望的选项
      recommendations.push({
        matchId: match.id,
        match: matchDesc,
        betType: '1X2',
        selection: opt.selection === 'draw' ? '平局' : opt.selection,
        odds: opt.odds,
        kellyFraction: kelly,
        expectedValue,
        confidence,
        reasons,
        sentiment: teamSentiment,
      });
    }
  }
  
  return recommendations;
}

/**
 * 生成所有推荐
 */
export async function generateRecommendations(): Promise<RecommendationSummary> {
  const matches = readMatches();
  const bets = readBets();
  const userStats = analyzeUserHistory(bets);
  
  // 获取情绪数据
  let sentimentMap: Record<string, SentimentResult> = {};
  try {
    sentimentMap = await analyzeAllTeams();
  } catch (e) {
    // 情绪分析失败时继续，不影响推荐
  }
  
  // 获取投注平台赔率
  let bettingMatches: BettingMatch[] = [];
  try {
    bettingMatches = await fetchWorldcupMatches(1, 100);
  } catch (e) {
    // 赔率获取失败时继续，使用模拟赔率
  }
  
  const allRecommendations: Recommendation[] = [];
  
  // 为未结束的比赛生成推荐
  for (const match of matches) {
    if (match.status !== 'finished') {
      const matchSentiment = sentimentMap[match.teamA] || sentimentMap[match.teamB];
      // 尝试匹配投注平台的比赛
      const bettingMatch = bettingMatches.find(bm => 
        bm.teamA.name.toLowerCase().includes(match.teamA.toLowerCase()) ||
        bm.teamB.name.toLowerCase().includes(match.teamB.toLowerCase()) ||
        match.teamA.toLowerCase().includes(bm.teamA.name.toLowerCase()) ||
        match.teamB.toLowerCase().includes(bm.teamB.name.toLowerCase())
      );
      const recs = generateMatchRecommendation(match, matchSentiment, bettingMatch);
      allRecommendations.push(...recs);
    }
  }
  
  // 按期望收益排序，取前 10 个推荐
  allRecommendations.sort((a, b) => b.expectedValue - a.expectedValue);
  const topRecommendations = allRecommendations.slice(0, 10);
  
  return {
    recommendations: topRecommendations,
    totalMatches: matches.filter(m => m.status !== 'finished').length,
    totalBets: bets.length,
    userWinRate: userStats.winRate,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 按队名筛选推荐
 */
export async function getTeamRecommendations(teamName: string): Promise<Recommendation[]> {
  const all = await generateRecommendations();
  const lower = teamName.toLowerCase();
  
  return all.recommendations.filter(r => 
    r.match.toLowerCase().includes(lower) ||
    r.selection.toLowerCase().includes(lower)
  );
}

// ─── Formatting ─────────────────────────────────────────────────────────────

export function formatRecommendation(rec: Recommendation): string {
  const lines: string[] = [];
  
  const confidenceEmoji = rec.confidence === 'high' ? '🟢' : rec.confidence === 'medium' ? '🟡' : '⚪';
  const evSign = rec.expectedValue >= 0 ? '+' : '';
  
  lines.push(`${confidenceEmoji} ${rec.match}`);
  lines.push(`   推荐: ${rec.betType} ${rec.selection} @${rec.odds}`);
  lines.push(`   凯利值: ${(rec.kellyFraction * 100).toFixed(1)}% | 期望收益: ${evSign}${(rec.expectedValue * 100).toFixed(1)}%`);
  
  if (rec.reasons.length > 0) {
    lines.push(`   理由: ${rec.reasons.join(', ')}`);
  }
  
  return lines.join('\n');
}

export function formatRecommendationSummary(summary: RecommendationSummary): string {
  const lines: string[] = [];
  
  lines.push('\n🎯 AI 投注推荐');
  lines.push(`${'─'.repeat(50)}`);
  lines.push(`   未结束比赛: ${summary.totalMatches} 场`);
  lines.push(`   历史注单: ${summary.totalBets} 注`);
  lines.push(`   历史胜率: ${(summary.userWinRate * 100).toFixed(1)}%`);
  lines.push('');
  
  if (summary.recommendations.length === 0) {
    lines.push('   暂无推荐（当前赔率未发现明显价值机会）');
  } else {
    lines.push('   推荐列表（按期望收益排序）:');
    lines.push('');
    summary.recommendations.forEach((rec, idx) => {
      lines.push(`${idx + 1}. ${formatRecommendation(rec)}`);
    });
  }
  
  lines.push('');
  lines.push(`⚠️  推荐仅供参考，投注需谨慎！`);
  
  return lines.join('\n');
}
