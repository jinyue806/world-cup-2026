/**
 * WC26 情绪分析命令
 *
 * 职责：查询球队社交媒体情绪分析。
 */
import { analyzeTeam, analyzeAllTeams, formatSentiment, formatSentimentRanking } from '../lib/sentimentAnalyzer';

/**
 * cmdSentiment - 情绪分析
 *
 * 用法:
 *   sentiment                    显示所有球队情绪排名
 *   sentiment --team <队名>      显示指定球队的情绪分析
 */
export async function cmdSentiment(args: Record<string, string>): Promise<void> {
  const teamFilter = args.team;

  if (teamFilter) {
    console.log(`🔍 正在分析 ${teamFilter} 的社交媒体情绪...`);
    
    const result = await analyzeTeam(teamFilter);
    if (!result) {
      console.log(`📭 没有找到 ${teamFilter} 相关的讨论数据`);
      return;
    }
    
    console.log(formatSentiment(result));
  } else {
    console.log('🔍 正在分析各球队的社交媒体情绪...');
    
    const ranking = await getSentimentRanking();
    console.log(formatSentimentRanking(ranking));
  }
}

async function getSentimentRanking() {
  const { getSentimentRanking: getRanking } = await import('../lib/sentimentAnalyzer');
  return getRanking();
}
