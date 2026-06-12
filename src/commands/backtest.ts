/**
 * WC26 回测命令
 *
 * 职责：用历史数据验证投注策略。
 */
import { 
  backtestAllStrategies, 
  backtestByYear, 
  backtestWithPremierLeague,
  formatBacktestResult, 
  formatBacktestSummary,
  strategies 
} from '../lib/backtester';
import { getAllHistoricalMatches, getMatchesByYear, getAvailableYears } from '../lib/historyLoader';

/**
 * cmdBacktest - 回测命令
 *
 * 用法:
 *   backtest                          回测英超联赛数据
 *   backtest --worldcup               回测世界杯数据
 *   backtest --year 2022              回测指定年份
 *   backtest --strategy <名称>        回测指定策略
 *   backtest --list                   列出所有策略
 */
export function cmdBacktest(args: Record<string, string>): void {
  // 列出策略
  if (args.list === 'true') {
    console.log('\n📋 可用策略');
    console.log(`${'─'.repeat(50)}`);
    for (const s of strategies) {
      console.log(`  ${s.name}`);
      console.log(`    ${s.description}`);
    }
    return;
  }
  
  const year = args.year ? parseInt(args.year) : undefined;
  const strategyName = args.strategy;
  const useWorldCup = args.worldcup === 'true';
  
  console.log('🔍 正在进行回测分析...');
  
  let results;
  
  if (useWorldCup) {
    // 回测世界杯数据
    if (year) {
      const matches = getMatchesByYear(year);
      if (matches.length === 0) {
        console.log(`📭 没有找到 ${year} 年的比赛数据`);
        const available = getAvailableYears();
        console.log(`   可用年份: ${available.join(', ')}`);
        return;
      }
      
      if (strategyName) {
        const strategy = strategies.find(s => s.name.includes(strategyName));
        if (!strategy) {
          console.log(`❌ 找不到策略: ${strategyName}`);
          console.log('   使用 --list 查看可用策略');
          return;
        }
        const { backtestStrategy } = require('../lib/backtester');
        results = [backtestStrategy(strategy, matches)];
      } else {
        results = backtestAllStrategies(matches);
      }
      
      console.log(`\n📅 ${year} 年世界杯回测`);
    } else {
      results = backtestAllStrategies(getAllHistoricalMatches());
      console.log('\n📅 所有世界杯数据回测');
    }
  } else {
    // 回测英超联赛数据（真实赔率）
    if (strategyName) {
      const strategy = strategies.find(s => s.name.includes(strategyName));
      if (!strategy) {
        console.log(`❌ 找不到策略: ${strategyName}`);
        console.log('   使用 --list 查看可用策略');
        return;
      }
      const { backtestStrategy } = require('../lib/backtester');
      const { loadPremierLeagueData } = require('../lib/leagueDataLoader');
      const matches = loadPremierLeagueData();
      results = [backtestStrategy(strategy, matches)];
    } else {
      results = backtestWithPremierLeague();
    }
    
    console.log('\n📅 英超联赛真实数据回测（含真实赔率）');
  }
  
  // 显示结果
  console.log(formatBacktestSummary(results));
  
  // 显示最佳策略的详细信息
  const best = results.sort((a, b) => b.roi - a.roi)[0];
  if (best && best.totalBets > 0) {
    console.log(formatBacktestResult(best));
  }
}
