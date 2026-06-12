/**
 * WC26 热搜关键词提取
 *
 * 职责：从用户下注记录中提取球队关键词，用于热搜搜索。
 */
import { Bet, Match } from '../types';

/**
 * 从注单中提取球队关键词
 * @param bets - 用户下注记录
 * @param matches - 比赛数据
 * @returns 去重后的关键词列表（包含"世界杯"）
 */
export function extractKeywordsFromBets(bets: Bet[], matches: Match[]): string[] {
  const keywords = new Set<string>();
  keywords.add('世界杯');

  for (const bet of bets) {
    const match = matches.find(m => m.id === bet.matchId);
    if (match) {
      if (match.teamA) keywords.add(match.teamA);
      if (match.teamB) keywords.add(match.teamB);
    }
  }

  return Array.from(keywords);
}

/**
 * 合并关键词（自动 + 用户自定义）
 * @param autoKeywords - 从注单提取的关键词
 * @param userKeywords - 用户自定义关键词
 * @returns 去重后的合并关键词
 */
export function mergeKeywords(autoKeywords: string[], userKeywords: string[]): string[] {
  const merged = new Set([...autoKeywords, ...userKeywords]);
  return Array.from(merged);
}
