/**
 * WC26 回测模块
 *
 * 职责：用历史数据验证投注策略，评估预测准确性。
 * 说明：免费的历史赔率数据无法获取，世界杯数据使用 ELO 排名估算赔率。
 */

import { getAllHistoricalMatches, type HistoricalMatch } from './historyLoader';
import { loadPremierLeagueData, type LeagueMatch } from './leagueDataLoader';
import { analyzeMatch as eloAnalyze, type EloMatch } from './eloRating';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BacktestBet {
  matchId: string;
  match: string;
  betType: '1X2';
  selection: string;
  odds: number;
  stake: number;
  result: 'won' | 'lost' | 'void';
  profit: number;
}

export interface BacktestResult {
  strategy: string;
  totalBets: number;
  won: number;
  lost: number;
  voided: number;
  totalStake: number;
  totalProfit: number;
  roi: number;
  winRate: number;
  bets: BacktestBet[];
}

export interface Strategy {
  name: string;
  description: string;
  analyze: (match: HistoricalMatch | LeagueMatch) => { selection: string; odds: number; confidence: number } | null;
}

// ─── Strategies ─────────────────────────────────────────────────────────────

/**
 * 策略1: 低赔率热门策略
 * 选择赔率最低的选项（最被看好的）
 */
const favoriteStrategy: Strategy = {
  name: '低赔率热门',
  description: '选择赔率最低的选项（最被看好的）',
  analyze: (match) => {
    let odds: { home: number; draw: number; away: number };
    let homeTeam: string;
    let awayTeam: string;
    
    // 获取赔率和球队名
    if ('odds' in match) {
      // HistoricalMatch - 使用 ELO 估算
      const eloMatch = eloAnalyze(match.teamA, match.teamB);
      odds = eloMatch.estimatedOdds;
      homeTeam = match.teamA;
      awayTeam = match.teamB;
    } else {
      // LeagueMatch - 使用真实赔率
      odds = match.odds;
      homeTeam = match.homeTeam;
      awayTeam = match.awayTeam;
    }
    
    // 找出最低赔率
    const options = [
      { selection: homeTeam, odds: odds.home },
      { selection: 'draw', odds: odds.draw },
      { selection: awayTeam, odds: odds.away },
    ];
    
    const favorite = options.reduce((min, opt) => 
      opt.odds < min.odds ? opt : min
    );
    
    // 只选择赔率低于 2.0 的（高置信度）
    if (favorite.odds < 2.0) {
      return {
        selection: favorite.selection,
        odds: favorite.odds,
        confidence: 1 / favorite.odds,
      };
    }
    
    return null;
  },
};

/**
 * 策略2: 价值投注策略
 * 寻找赔率与隐含概率不匹配的选项
 */
const valueStrategy: Strategy = {
  name: '价值投注',
  description: '寻找赔率与隐含概率不匹配的选项',
  analyze: (match) => {
    let odds: { home: number; draw: number; away: number };
    let homeTeam: string;
    let awayTeam: string;
    
    // 获取赔率和球队名
    if ('odds' in match) {
      // HistoricalMatch - 使用 ELO 估算
      const eloMatch = eloAnalyze(match.teamA, match.teamB);
      odds = eloMatch.estimatedOdds;
      homeTeam = match.teamA;
      awayTeam = match.teamB;
    } else {
      // LeagueMatch - 使用真实赔率
      odds = match.odds;
      homeTeam = match.homeTeam;
      awayTeam = match.awayTeam;
    }
    
    const options = [
      { selection: homeTeam, odds: odds.home },
      { selection: 'draw', odds: odds.draw },
      { selection: awayTeam, odds: odds.away },
    ];
    
    // 计算隐含概率
    const totalImplied = options.reduce((sum, opt) => sum + 1 / opt.odds, 0);
    
    // 寻找被低估的选项（隐含概率 < 真实概率）
    for (const opt of options) {
      const impliedProb = 1 / opt.odds;
      const trueProb = impliedProb / totalImplied; // 标准化
      
      // 如果真实概率明显高于隐含概率，认为有价值
      if (trueProb > impliedProb * 1.2) {
        return {
          selection: opt.selection,
          odds: opt.odds,
          confidence: trueProb,
        };
      }
    }
    
    return null;
  },
};

/**
 * 策略3: 主场优势策略
 * 在小组赛中选择主队（实际是第一列出的队伍）
 */
const homeAdvantageStrategy: Strategy = {
  name: '主场优势',
  description: '小组赛中优先选择排名靠前的队伍',
  analyze: (match) => {
    // 只在小组赛中使用
    if (!match.group) return null;
    
    let odds: { home: number; draw: number; away: number };
    let homeTeam: string;
    
    // 获取赔率
    if ('odds' in match) {
      const eloMatch = eloAnalyze(match.teamA, match.teamB);
      odds = eloMatch.estimatedOdds;
      homeTeam = match.teamA;
    } else {
      odds = match.odds;
      homeTeam = match.homeTeam;
    }
    
    // 如果主队赔率 < 客队，选择主队
    if (odds.home < odds.away && odds.home < 2.5) {
      return {
        selection: homeTeam,
        odds: odds.home,
        confidence: 1 / odds.home,
      };
    }
    
    return null;
  },
};

/**
 * 策略4: 冷门策略
 * 寻找高赔率但可能爆冷的比赛
 */
const upsetStrategy: Strategy = {
  name: '冷门策略',
  description: '寻找高赔率但可能爆冷的比赛',
  analyze: (match) => {
    let odds: { home: number; draw: number; away: number };
    
    // 获取赔率
    if ('odds' in match) {
      const eloMatch = eloAnalyze(match.teamA, match.teamB);
      odds = eloMatch.estimatedOdds;
    } else {
      odds = match.odds;
    }
    
    // 如果平局赔率较低，可能势均力敌
    if (odds.draw < 3.2) {
      return {
        selection: 'draw',
        odds: odds.draw,
        confidence: 1 / odds.draw,
      };
    }
    
    return null;
  },
};

export const strategies: Strategy[] = [
  favoriteStrategy,
  valueStrategy,
  homeAdvantageStrategy,
  upsetStrategy,
];

// ─── Backtesting Engine ─────────────────────────────────────────────────────

/**
 * 回测单个策略
 */
export function backtestStrategy(
  strategy: Strategy,
  matches: (HistoricalMatch | LeagueMatch)[],
  initialStake: number = 100
): BacktestResult {
  const bets: BacktestBet[] = [];
  
  for (const match of matches) {
    const signal = strategy.analyze(match);
    if (!signal) continue;
    
    // 确定结果
    let result: 'won' | 'lost' | 'void';
    let profit: number;
    
    // 获取比分
    let homeGoals: number;
    let awayGoals: number;
    let homeTeam: string;
    let awayTeam: string;
    
    if ('scoreA' in match) {
      // HistoricalMatch
      homeGoals = match.scoreA;
      awayGoals = match.scoreB;
      homeTeam = match.teamA;
      awayTeam = match.teamB;
    } else {
      // LeagueMatch
      homeGoals = match.homeGoals;
      awayGoals = match.awayGoals;
      homeTeam = match.homeTeam;
      awayTeam = match.awayTeam;
    }
    
    const isHomeWin = homeGoals > awayGoals;
    const isDraw = homeGoals === awayGoals;
    const isAwayWin = homeGoals < awayGoals;
    
    if (signal.selection === homeTeam) {
      result = isHomeWin ? 'won' : isDraw ? 'void' : 'lost';
    } else if (signal.selection === awayTeam) {
      result = isAwayWin ? 'won' : isDraw ? 'void' : 'lost';
    } else {
      // 平局
      result = isDraw ? 'won' : 'lost';
    }
    
    if (result === 'won') {
      profit = initialStake * (signal.odds - 1);
    } else if (result === 'lost') {
      profit = -initialStake;
    } else {
      profit = 0;
    }
    
    bets.push({
      matchId: match.id,
      match: `${homeTeam} vs ${awayTeam}`,
      betType: '1X2',
      selection: signal.selection,
      odds: signal.odds,
      stake: initialStake,
      result,
      profit,
    });
  }
  
  const won = bets.filter(b => b.result === 'won').length;
  const lost = bets.filter(b => b.result === 'lost').length;
  const voided = bets.filter(b => b.result === 'void').length;
  const totalStake = bets.reduce((sum, b) => sum + b.stake, 0);
  const totalProfit = bets.reduce((sum, b) => sum + b.profit, 0);
  const decided = won + lost;
  
  return {
    strategy: strategy.name,
    totalBets: bets.length,
    won,
    lost,
    voided,
    totalStake,
    totalProfit,
    roi: totalStake > 0 ? (totalProfit / totalStake) * 100 : 0,
    winRate: decided > 0 ? (won / decided) * 100 : 0,
    bets,
  };
}

/**
 * 回测所有策略
 */
export function backtestAllStrategies(
  matches: (HistoricalMatch | LeagueMatch)[],
  initialStake: number = 100
): BacktestResult[] {
  return strategies.map(strategy => 
    backtestStrategy(strategy, matches, initialStake)
  );
}

/**
 * 使用英超联赛数据回测
 */
export function backtestWithPremierLeague(
  initialStake: number = 100
): BacktestResult[] {
  const matches = loadPremierLeagueData();
  console.log(`📊 加载了 ${matches.length} 场英超比赛`);
  return backtestAllStrategies(matches, initialStake);
}

/**
 * 按年份回测
 */
export function backtestByYear(
  year: number,
  initialStake: number = 100
): BacktestResult[] {
  const { getMatchesByYear } = require('./historyLoader');
  const matches = getMatchesByYear(year);
  return backtestAllStrategies(matches, initialStake);
}

// ─── Formatting ─────────────────────────────────────────────────────────────

export function formatBacktestResult(result: BacktestResult): string {
  const lines: string[] = [];
  
  lines.push(`\n📊 策略: ${result.strategy}`);
  lines.push(`${'─'.repeat(50)}`);
  lines.push(`   总注数: ${result.totalBets}`);
  lines.push(`   已赢: ${result.won} | 已输: ${result.lost} | 走盘: ${result.voided}`);
  lines.push(`   胜率: ${result.winRate.toFixed(1)}%`);
  lines.push(`   总投入: ${result.totalStake}`);
  lines.push(`   净收益: ${result.totalProfit >= 0 ? '+' : ''}${result.totalProfit.toFixed(2)}`);
  lines.push(`   收益率: ${result.roi >= 0 ? '+' : ''}${result.roi.toFixed(1)}%`);
  
  return lines.join('\n');
}

export function formatBacktestSummary(results: BacktestResult[]): string {
  const lines: string[] = [];
  
  lines.push('\n🎯 回测结果汇总');
  lines.push(`${'═'.repeat(60)}`);
  
  // 按 收益率 排序
  const sorted = [...results].sort((a, b) => b.roi - a.roi);
  
  for (const result of sorted) {
    const emoji = result.roi > 0 ? '🟢' : result.roi < 0 ? '🔴' : '🟡';
    lines.push(`${emoji} ${result.strategy.padEnd(12)} | 胜率 ${result.winRate.toFixed(1)}% | 收益率 ${result.roi >= 0 ? '+' : ''}${result.roi.toFixed(1)}% | ${result.totalBets} 注`);
  }
  
  lines.push(`${'═'.repeat(60)}`);
  
  // 推荐最佳策略
  const best = sorted[0];
  if (best && best.roi > 0) {
    lines.push(`\n🏆 推荐策略: ${best.strategy}`);
    lines.push(`   历史胜率: ${best.winRate.toFixed(1)}%`);
    lines.push(`   历史 收益率: +${best.roi.toFixed(1)}%`);
  } else {
    lines.push(`\n⚠️  所有策略在历史数据上均为负收益，建议谨慎投注`);
  }
  
  return lines.join('\n');
}
