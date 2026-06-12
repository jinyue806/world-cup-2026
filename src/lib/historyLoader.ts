/**
 * WC26 历史数据加载模块
 *
 * 职责：加载往届世界杯比赛数据。
 */

import fs from 'fs';
import path from 'path';

export interface HistoricalMatch {
  id: string;
  group?: string;
  round?: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  date: string;
  status: 'finished';
  odds: {
    home: number;
    draw: number;
    away: number;
  };
  penalties?: {
    winner: string;
    score: string;
  };
}

export interface HistoricalWorldCup {
  year: number;
  name: string;
  location: string;
  matches: HistoricalMatch[];
}

const HISTORY_DIR = path.join(__dirname, '..', 'data', 'history');

/**
 * 加载指定年份的世界杯数据
 */
export function loadWorldCup(year: number): HistoricalWorldCup | null {
  const filePath = path.join(HISTORY_DIR, `worldcup${year}.json`);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error(`加载 ${year} 世界杯数据失败:`, (e as Error).message);
    return null;
  }
}

/**
 * 获取所有可用的历史世界杯年份
 */
export function getAvailableYears(): number[] {
  const years: number[] = [];
  
  if (!fs.existsSync(HISTORY_DIR)) {
    return years;
  }
  
  const files = fs.readdirSync(HISTORY_DIR);
  for (const file of files) {
    const match = file.match(/^worldcup(\d{4})\.json$/);
    if (match) {
      years.push(parseInt(match[1]));
    }
  }
  
  return years.sort();
}

/**
 * 获取所有历史比赛
 */
export function getAllHistoricalMatches(): HistoricalMatch[] {
  const matches: HistoricalMatch[] = [];
  const years = getAvailableYears();
  
  for (const year of years) {
    const wc = loadWorldCup(year);
    if (wc) {
      matches.push(...wc.matches);
    }
  }
  
  return matches;
}

/**
 * 按年份获取比赛
 */
export function getMatchesByYear(year: number): HistoricalMatch[] {
  const wc = loadWorldCup(year);
  return wc ? wc.matches : [];
}

/**
 * 按球队获取历史比赛
 */
export function getMatchesByTeam(teamName: string): HistoricalMatch[] {
  const allMatches = getAllHistoricalMatches();
  const lower = teamName.toLowerCase();
  
  return allMatches.filter(m => 
    m.teamA.toLowerCase().includes(lower) || 
    m.teamB.toLowerCase().includes(lower)
  );
}
