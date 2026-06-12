/**
 * WC26 真实历史数据加载模块
 *
 * 职责：从 football-data.co.uk CSV 文件加载真实比赛数据和赔率。
 */

import fs from 'fs';
import path from 'path';

export interface LeagueMatch {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  result: 'H' | 'D' | 'A';
  odds: {
    home: number;
    draw: number;
    away: number;
    source: string;
  };
}

const HISTORY_DIR = path.join(__dirname, '..', 'data', 'history');

/**
 * 解析 CSV 行为比赛数据
 */
function parseCSVRow(line: string): LeagueMatch | null {
  const parts = line.split(',');
  if (parts.length < 10) return null;
  
  const [div, date, time, homeTeam, awayTeam, fthg, ftag, ftr] = parts;
  
  // 跳过无效行
  if (!homeTeam || !awayTeam || !fthg || !ftag || !ftr) return null;
  
  // 获取 Bet365 赔率（第 23-25 列）
  const b365H = parseFloat(parts[22]) || 0;
  const b365D = parseFloat(parts[23]) || 0;
  const b365A = parseFloat(parts[24]) || 0;
  
  // 获取平均赔率（第 43-45 列）
  const avgH = parseFloat(parts[42]) || 0;
  const avgD = parseFloat(parts[43]) || 0;
  const avgA = parseFloat(parts[44]) || 0;
  
  // 使用 Bet365 赔率，如果没有则用平均赔率
  const homeOdds = b365H || avgH;
  const drawOdds = b365D || avgD;
  const awayOdds = b365A || avgA;
  
  if (homeOdds === 0 || drawOdds === 0 || awayOdds === 0) return null;
  
  return {
    id: `${date}_${homeTeam}_vs_${awayTeam}`,
    date: convertDate(date),
    homeTeam,
    awayTeam,
    homeGoals: parseInt(fthg),
    awayGoals: parseInt(ftag),
    result: ftr as 'H' | 'D' | 'A',
    odds: {
      home: homeOdds,
      draw: drawOdds,
      away: awayOdds,
      source: b365H > 0 ? 'Bet365' : 'Average',
    },
  };
}

/**
 * 转换日期格式 (DD/MM/YYYY -> YYYY-MM-DD)
 */
function convertDate(dateStr: string): string {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/**
 * 加载英格兰超级联赛数据
 */
export function loadPremierLeagueData(): LeagueMatch[] {
  const matches: LeagueMatch[] = [];
  
  // 加载多个赛季的数据
  const seasons = [
    'england_2021_22.csv',
    'england_2022_23.csv',
    'england_2023_24.csv',
  ];
  
  for (const season of seasons) {
    const filePath = path.join(HISTORY_DIR, season);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  未找到文件: ${season}`);
      continue;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      
      // 跳过标题行
      for (let i = 1; i < lines.length; i++) {
        const match = parseCSVRow(lines[i]);
        if (match) {
          matches.push(match);
        }
      }
      
      console.log(`✅ 加载 ${season}: ${lines.length - 1} 场比赛`);
    } catch (e) {
      console.error(`❌ 加载 ${season} 失败:`, (e as Error).message);
    }
  }
  
  return matches;
}

/**
 * 按球队筛选比赛
 */
export function filterByTeam(matches: LeagueMatch[], teamName: string): LeagueMatch[] {
  const lower = teamName.toLowerCase();
  return matches.filter(m => 
    m.homeTeam.toLowerCase().includes(lower) || 
    m.awayTeam.toLowerCase().includes(lower)
  );
}

/**
 * 按日期范围筛选比赛
 */
export function filterByDateRange(
  matches: LeagueMatch[], 
  startDate: string, 
  endDate: string
): LeagueMatch[] {
  return matches.filter(m => m.date >= startDate && m.date <= endDate);
}

/**
 * 获取球队统计
 */
export function getTeamStats(
  matches: LeagueMatch[], 
  teamName: string
): {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  avgHomeOdds: number;
  avgAwayOdds: number;
} {
  const teamMatches = filterByTeam(matches, teamName);
  const lower = teamName.toLowerCase();
  
  let played = 0;
  let won = 0;
  let drawn = 0;
  let lost = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let totalHomeOdds = 0;
  let totalAwayOdds = 0;
  let homeGames = 0;
  let awayGames = 0;
  
  for (const match of teamMatches) {
    played++;
    goalsFor += match.homeTeam.toLowerCase().includes(lower) ? match.homeGoals : match.awayGoals;
    goalsAgainst += match.homeTeam.toLowerCase().includes(lower) ? match.awayGoals : match.homeGoals;
    
    const isHome = match.homeTeam.toLowerCase().includes(lower);
    if (isHome) {
      homeGames++;
      totalHomeOdds += match.odds.home;
      if (match.result === 'H') won++;
      else if (match.result === 'D') drawn++;
      else lost++;
    } else {
      awayGames++;
      totalAwayOdds += match.odds.away;
      if (match.result === 'A') won++;
      else if (match.result === 'D') drawn++;
      else lost++;
    }
  }
  
  return {
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    avgHomeOdds: homeGames > 0 ? totalHomeOdds / homeGames : 0,
    avgAwayOdds: awayGames > 0 ? totalAwayOdds / awayGames : 0,
  };
}
