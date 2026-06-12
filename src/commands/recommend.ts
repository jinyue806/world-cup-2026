/**
 * WC26 AI 推荐命令
 *
 * 职责：根据赔率、历史数据、情绪分析，推荐最佳投注。
 */
import { generateRecommendations, getTeamRecommendations, formatRecommendationSummary, formatRecommendation } from '../lib/recommender';

/**
 * cmdRecommend - AI 投注推荐
 *
 * 用法:
 *   recommend                    显示所有推荐
 *   recommend --team <队名>      显示指定球队相关推荐
 */
export async function cmdRecommend(args: Record<string, string>): Promise<void> {
  const teamFilter = args.team;

  if (teamFilter) {
    console.log(`🔍 正在分析 ${teamFilter} 相关比赛的投注价值...`);
    
    const recs = await getTeamRecommendations(teamFilter);
    
    if (recs.length === 0) {
      console.log(`📭 没有找到 ${teamFilter} 相关比赛的推荐`);
      return;
    }
    
    console.log(`\n🎯 ${teamFilter} 相关推荐`);
    console.log(`${'─'.repeat(50)}`);
    recs.forEach((rec, idx) => {
      console.log(`${idx + 1}. ${formatRecommendation(rec)}`);
    });
  } else {
    console.log('🔍 正在分析所有比赛的投注价值...');
    
    const summary = await generateRecommendations();
    console.log(formatRecommendationSummary(summary));
  }
}
