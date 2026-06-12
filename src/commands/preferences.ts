/**
 * WC26 用户偏好管理命令
 *
 * 职责：管理用户的偏好球队设置。
 */
import { 
  loadPreferences, 
  addFavoriteTeam, 
  removeFavoriteTeam,
  addDislikedTeam,
  removeDislikedTeam,
  formatPreferences 
} from '../lib/userPreferences';

/**
 * cmdPreferences - 偏好管理
 *
 * 用法:
 *   prefer list                           显示当前偏好设置
 *   prefer add <队名>                     添加偏好球队
 *   prefer remove <队名>                  移除偏好球队
 *   prefer dislike <队名>                 添加不喜欢的球队
 *   prefer undislike <队名>               移除不喜欢的球队
 */
export function cmdPreferences(args: Record<string, string>, positional: string[]): void {
  const action = positional[0] || 'list';
  const team = positional[1];
  
  switch (action) {
    case 'list':
      const prefs = loadPreferences();
      console.log(formatPreferences(prefs));
      break;
      
    case 'add':
      if (!team) {
        console.error('❌ 用法: prefer add <队名>');
        console.error('   示例: prefer add 韩国');
        process.exit(1);
      }
      addFavoriteTeam(team);
      console.log(`✅ 已添加偏好球队: ${team}`);
      break;
      
    case 'remove':
      if (!team) {
        console.error('❌ 用法: prefer remove <队名>');
        process.exit(1);
      }
      removeFavoriteTeam(team);
      console.log(`✅ 已移除偏好球队: ${team}`);
      break;
      
    case 'dislike':
      if (!team) {
        console.error('❌ 用法: prefer dislike <队名>');
        process.exit(1);
      }
      addDislikedTeam(team);
      console.log(`✅ 已添加不喜欢的球队: ${team}`);
      break;
      
    case 'undislike':
      if (!team) {
        console.error('❌ 用法: prefer undislike <队名>');
        process.exit(1);
      }
      removeDislikedTeam(team);
      console.log(`✅ 已移除不喜欢的球队: ${team}`);
      break;
      
    default:
      console.error(`❌ 未知操作: ${action}`);
      console.error('   可用操作: list, add, remove, dislike, undislike');
      process.exit(1);
  }
}
