/**
 * WC26 热搜共用模块
 *
 * 职责：提供热搜查询、权重排序、格式化输出等功能。
 */

import { fetchHotboard, type HotItem } from './hotboardApi';
import { loadPreferences, getTeamWeight } from './userPreferences';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WeightedHotItem extends HotItem {
  weight: number;
  matchedTeams: string[];
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * 获取球队相关热搜（带权重）
 */
export async function getTeamHotSearch(
  teamName: string,
  platform: string = 'weibo'
): Promise<WeightedHotItem[]> {
  try {
    const data = await fetchHotboard(platform);
    const prefs = loadPreferences();
    const teamWeight = getTeamWeight(teamName);
    
    return data.list
      .filter(item => item.title.includes(teamName))
      .map(item => ({
        ...item,
        weight: teamWeight,
        matchedTeams: [teamName],
      }));
  } catch (e) {
    return [];
  }
}

/**
 * 获取多支球队相关热搜（带权重排序）
 */
export async function getMultiTeamHotSearch(
  teamNames: string[],
  platform: string = 'weibo'
): Promise<WeightedHotItem[]> {
  try {
    const data = await fetchHotboard(platform);
    const prefs = loadPreferences();
    const results: WeightedHotItem[] = [];
    
    for (const item of data.list) {
      const matchedTeams: string[] = [];
      let totalWeight = 0;
      
      for (const team of teamNames) {
        if (item.title.includes(team)) {
          matchedTeams.push(team);
          totalWeight += getTeamWeight(team);
        }
      }
      
      if (matchedTeams.length > 0) {
        results.push({
          ...item,
          weight: totalWeight,
          matchedTeams,
        });
      }
    }
    
    // 按权重排序
    return results.sort((a, b) => b.weight - a.weight);
  } catch (e) {
    return [];
  }
}

/**
 * 获取今日世界杯热搜（带偏好权重）
 */
export async function getWorldCupHotSearch(
  platform: string = 'weibo'
): Promise<WeightedHotItem[]> {
  try {
    const data = await fetchHotboard(platform);
    const prefs = loadPreferences();
    const worldCupKeywords = ['世界杯', 'WC26', '2026世界杯', 'FIFA'];
    
    return data.list
      .filter(item => 
        worldCupKeywords.some(kw => item.title.includes(kw))
      )
      .map(item => {
        let weight = 0;
        const matchedTeams: string[] = [];
        
        // 检查是否包含偏好球队
        for (const team of prefs.favoriteTeams) {
          if (item.title.includes(team)) {
            weight += 10;
            matchedTeams.push(team);
          }
        }
        
        // 检查是否包含不喜欢的球队
        for (const team of prefs.dislikedTeams) {
          if (item.title.includes(team)) {
            weight -= 5;
            matchedTeams.push(team);
          }
        }
        
        return {
          ...item,
          weight,
          matchedTeams,
        };
      })
      .sort((a, b) => b.weight - a.weight);
  } catch (e) {
    return [];
  }
}

// ─── Formatting ─────────────────────────────────────────────────────────────

/**
 * 格式化球队热搜输出
 */
export function formatTeamHotSearch(
  items: WeightedHotItem[],
  teamName: string
): string {
  if (items.length === 0) return '';
  
  const lines: string[] = [];
  lines.push(`\n🔥 ${teamName} 相关热搜:`);
  
  items.slice(0, 3).forEach(item => {
    const hot = Number(item.hot_value) > 10000
      ? `${(Number(item.hot_value) / 10000).toFixed(1)}万`
      : item.hot_value;
    lines.push(`   ${item.title} (${hot})`);
  });
  
  return lines.join('\n');
}

/**
 * 格式化多球队热搜输出
 */
export function formatMultiTeamHotSearch(
  items: WeightedHotItem[]
): string {
  if (items.length === 0) return '';
  
  const lines: string[] = [];
  lines.push('\n🔥 相关热搜:');
  
  items.slice(0, 5).forEach(item => {
    const hot = Number(item.hot_value) > 10000
      ? `${(Number(item.hot_value) / 10000).toFixed(1)}万`
      : item.hot_value;
    const teams = item.matchedTeams.join(', ');
    lines.push(`   ${item.title} (${hot}) [${teams}]`);
  });
  
  return lines.join('\n');
}

/**
 * 格式化世界杯热搜输出
 */
export function formatWorldCupHotSearch(items: WeightedHotItem[]): string {
  if (items.length === 0) return '';
  
  const lines: string[] = [];
  lines.push('\n📰 世界杯热搜:');
  
  items.slice(0, 5).forEach((item, idx) => {
    const hot = Number(item.hot_value) > 10000
      ? `${(Number(item.hot_value) / 10000).toFixed(1)}万`
      : item.hot_value;
    const teams = item.matchedTeams.length > 0 ? ` [${item.matchedTeams.join(', ')}]` : '';
    lines.push(`   ${idx + 1}. ${item.title} (${hot})${teams}`);
  });
  
  return lines.join('\n');
}
