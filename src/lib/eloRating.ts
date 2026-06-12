/**
 * WC26 ELO 排名模块
 *
 * 职责：基于 ELO 排名系统估算比赛赔率。
 * 说明：免费的历史赔率数据无法获取，使用 ELO 排名作为替代方案。
 */

import { teamZhName } from './parser';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TeamRating {
  team: string;
  rating: number;
  matches: number;
  lastUpdated: string;
}

export interface EloMatch {
  homeTeam: string;
  awayTeam: string;
  homeRating: number;
  awayRating: number;
  expectedHomeWin: number;
  expectedDraw: number;
  expectedAwayWin: number;
  estimatedOdds: {
    home: number;
    draw: number;
    away: number;
  };
}

// ─── ELO Constants ──────────────────────────────────────────────────────────

/** 基础 ELO 分数 */
const BASE_RATING = 1500;

/** K 因子（影响每场比赛的分数变动） */
const K_FACTOR = 32;

/** 主场优势（约 100 分） */
const HOME_ADVANTAGE = 100;

// ─── FIFA 国家队初始 ELO 排名（2022年世界杯前） ────────────────────────────────

const INITIAL_RATINGS: Record<string, number> = {
  // 强队
  'Brazil': 1850,
  'Belgium': 1820,
  'France': 1810,
  'Argentina': 1790,
  'England': 1780,
  'Spain': 1770,
  'Netherlands': 1760,
  'Portugal': 1750,
  'Germany': 1740,
  'Croatia': 1720,
  
  // 中等球队
  'Uruguay': 1700,
  'Denmark': 1690,
  'Switzerland': 1680,
  'Senegal': 1670,
  'Morocco': 1660,
  'Serbia': 1650,
  'Poland': 1640,
  'Tunisia': 1630,
  'Japan': 1620,
  'South Korea': 1610,
  'Australia': 1600,
  'Mexico': 1590,
  'Ecuador': 1580,
  'Cameroon': 1570,
  'Ghana': 1560,
  'Iran': 1550,
  'Costa Rica': 1540,
  'USA': 1530,
  'Saudi Arabia': 1520,
  'Canada': 1510,
  'Qatar': 1500,
  'Wales': 1490,
};

// ─── ELO Calculations ───────────────────────────────────────────────────────

/**
 * 计算两队的预期胜率
 */
function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * 计算三结果概率（胜/平/负）
 */
function calculateThreeWayProbabilities(
  homeRating: number,
  awayRating: number
): { home: number; draw: number; away: number } {
  // 添加主场优势
  const adjustedHome = homeRating + HOME_ADVANTAGE;
  
  // 计算主队预期胜率
  const expectedHomeWin = calculateExpectedScore(adjustedHome, awayRating);
  const expectedAwayWin = calculateExpectedScore(awayRating, adjustedHome);
  
  // 估算平局概率（基于实力差距）
  const ratingDiff = Math.abs(adjustedHome - awayRating);
  
  // 实力越接近，平局概率越高
  let drawProbability: number;
  if (ratingDiff < 50) {
    drawProbability = 0.28; // 实力接近
  } else if (ratingDiff < 150) {
    drawProbability = 0.25;
  } else if (ratingDiff < 300) {
    drawProbability = 0.22;
  } else {
    drawProbability = 0.18; // 实力悬殊
  }
  
  // 标准化概率
  const total = expectedHomeWin + expectedAwayWin + drawProbability;
  
  return {
    home: expectedHomeWin / total,
    draw: drawProbability / total,
    away: expectedAwayWin / total,
  };
}

/**
 * 概率转赔率（含庄家抽水）
 */
function probabilityToOdds(prob: number, margin: number = 0.05): number {
  // 添加庄家抽水
  const adjustedProb = prob * (1 - margin);
  return 1 / adjustedProb;
}

// ─── Public Functions ────────────────────────────────────────────────────────

/**
 * 获取球队 ELO 排名
 * 支持中英文队名
 */
export function getTeamRating(team: string): number {
  // 直接匹配
  if (INITIAL_RATINGS[team]) {
    return INITIAL_RATINGS[team];
  }
  
  // 尝试中文名匹配
  const lower = team.toLowerCase();
  for (const [key, rating] of Object.entries(INITIAL_RATINGS)) {
    if (key.toLowerCase() === lower) {
      return rating;
    }
    // 检查中文名
    const zhName = teamZhName(key);
    if (zhName === team) {
      return rating;
    }
  }
  
  return BASE_RATING;
}

/**
 * 分析比赛并生成赔率估算
 */
export function analyzeMatch(homeTeam: string, awayTeam: string): EloMatch {
  const homeRating = getTeamRating(homeTeam);
  const awayRating = getTeamRating(awayTeam);
  
  const probs = calculateThreeWayProbabilities(homeRating, awayRating);
  
  return {
    homeTeam,
    awayTeam,
    homeRating,
    awayRating,
    expectedHomeWin: probs.home,
    expectedDraw: probs.draw,
    expectedAwayWin: probs.away,
    estimatedOdds: {
      home: probabilityToOdds(probs.home),
      draw: probabilityToOdds(probs.draw),
      away: probabilityToOdds(probs.away),
    },
  };
}

/**
 * 批量分析比赛
 */
export function analyzeMatches(
  matches: Array<{ homeTeam: string; awayTeam: string }>
): EloMatch[] {
  return matches.map(m => analyzeMatch(m.homeTeam, m.awayTeam));
}

/**
 * 更新 ELO 排名（比赛后）
 */
export function updateRatings(
  homeTeam: string,
  awayTeam: string,
  homeGoals: number,
  awayGoals: number
): { homeNewRating: number; awayNewRating: number } {
  const homeRating = getTeamRating(homeTeam) + HOME_ADVANTAGE;
  const awayRating = getTeamRating(awayTeam);
  
  // 实际结果
  let actualScore: number;
  if (homeGoals > awayGoals) {
    actualScore = 1; // 主队胜
  } else if (homeGoals < awayGoals) {
    actualScore = 0; // 客队胜
  } else {
    actualScore = 0.5; // 平局
  }
  
  // 预期结果
  const expectedScore = calculateExpectedScore(homeRating, awayRating);
  
  // 更新分数
  const homeChange = K_FACTOR * (actualScore - expectedScore);
  const awayChange = K_FACTOR * ((1 - actualScore) - (1 - expectedScore));
  
  return {
    homeNewRating: homeRating - homeChange + HOME_ADVANTAGE,
    awayNewRating: awayRating - awayChange,
  };
}

/**
 * 获取所有球队排名
 */
export function getAllRatings(): TeamRating[] {
  return Object.entries(INITIAL_RATINGS)
    .map(([team, rating]) => ({
      team,
      rating,
      matches: 0,
      lastUpdated: '2022-11-01',
    }))
    .sort((a, b) => b.rating - a.rating);
}

// ─── Formatting ─────────────────────────────────────────────────────────────

export function formatEloMatch(match: EloMatch): string {
  const lines: string[] = [];
  
  lines.push(`📊 ${match.homeTeam} vs ${match.awayTeam}`);
  lines.push(`   ELO 排名: ${match.homeRating} vs ${match.awayRating}`);
  lines.push(`   预期概率: 主胜 ${(match.expectedHomeWin * 100).toFixed(1)}% | 平局 ${(match.expectedDraw * 100).toFixed(1)}% | 客胜 ${(match.expectedAwayWin * 100).toFixed(1)}%`);
  lines.push(`   估算赔率: ${match.estimatedOdds.home.toFixed(2)} | ${match.estimatedOdds.draw.toFixed(2)} | ${match.estimatedOdds.away.toFixed(2)}`);
  
  return lines.join('\n');
}

export function formatRatingsTable(ratings: TeamRating[]): string {
  const lines: string[] = [];
  
  lines.push('\n🏆 FIFA 国家队 ELO 排名');
  lines.push(`${'─'.repeat(40)}`);
  lines.push(`${'#'.padStart(3)} ${'球队'.padEnd(20)} ${'ELO'.padStart(6)}`);
  lines.push(`${'─'.repeat(40)}`);
  
  ratings.slice(0, 20).forEach((r, idx) => {
    lines.push(`${String(idx + 1).padStart(3)} ${r.team.padEnd(20)} ${String(r.rating).padStart(6)}`);
  });
  
  return lines.join('\n');
}
