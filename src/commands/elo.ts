/**
 * WC26 ELO 排名命令
 *
 * 职责：显示球队 ELO 排名和赔率估算。
 * 说明：免费的历史赔率数据无法获取，使用 ELO 排名作为替代方案。
 */
import { getAllRatings, analyzeMatch, formatEloMatch, formatRatingsTable } from '../lib/eloRating';

/**
 * cmdElo - ELO 排名查询
 *
 * 用法:
 *   elo                           显示所有球队排名
 *   elo --match <主队> vs <客队>   分析比赛并显示估算赔率
 *   elo --team <队名>             显示指定球队排名
 */
export function cmdElo(args: Record<string, string>): void {
  // 显示所有排名
  if (!args.match && !args.team) {
    const ratings = getAllRatings();
    console.log(formatRatingsTable(ratings));
    console.log('\n⚠️  说明: 免费的历史赔率数据无法获取，使用 ELO 排名估算赔率。');
    return;
  }
  
  // 分析比赛
  if (args.match) {
    const parts = args.match.split(/vs|v/i);
    if (parts.length !== 2) {
      console.error('❌ 用法: elo --match <主队> vs <客队>');
      console.error('   示例: elo --match "巴西 vs 阿根廷"');
      return;
    }
    
    const homeTeam = parts[0].trim();
    const awayTeam = parts[1].trim();
    
    const match = analyzeMatch(homeTeam, awayTeam);
    console.log(formatEloMatch(match));
    console.log('\n⚠️  说明: 赔率基于 ELO 排名估算，仅供参考。');
    return;
  }
  
  // 显示指定球队
  if (args.team) {
    const ratings = getAllRatings();
    const team = ratings.find(r => 
      r.team.toLowerCase().includes(args.team!.toLowerCase())
    );
    
    if (!team) {
      console.log(`📭 找不到球队: ${args.team}`);
      return;
    }
    
    console.log(`\n📊 ${team.team}`);
    console.log(`   ELO 排名: ${team.rating}`);
    console.log(`   世界排名: #${ratings.indexOf(team) + 1}`);
  }
}
