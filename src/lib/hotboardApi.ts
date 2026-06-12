/**
 * WC26 热搜 API 客户端
 *
 * 数据源：uapis.cn
 * API：GET /api/v1/misc/hotboard
 *
 * 职责：获取各平台热搜数据，支持关键词过滤。
 */

const API_BASE = 'https://uapis.cn/api/v1/misc';
const API_KEY = process.env.UAPI_KEY || 'uapi-a-z3xb2sP0mKY7EJaMRd26AilT3mv56MKr4GTSSq';

export type HotPlatform = 'weibo' | 'zhihu' | 'douyin' | 'baidu' | 'bilibili' | 'toutiao';

export interface HotItem {
  index: number;
  title: string;
  url: string;
  hot_value: string;
  extra?: Record<string, unknown>;
}

interface HotboardResponse {
  type: string;
  update_time: string;
  list: HotItem[];
}

/**
 * 获取热搜数据
 */
export async function fetchHotboard(platform: HotPlatform = 'weibo'): Promise<HotboardResponse> {
  const url = `${API_BASE}/hotboard?type=${platform}`;
  const res = await fetch(url, {
    headers: { 'X-API-Key': API_KEY },
  });

  if (!res.ok) {
    throw new Error(`热搜 API 请求失败: ${res.status}`);
  }

  const json = await res.json() as any;
  if (json.code && json.code !== 'SUCCESS') {
    throw new Error(`热搜 API 错误: ${json.message || json.code}`);
  }

  return json;
}

/**
 * 按关键词过滤热搜
 */
export function filterByKeywords(items: HotItem[], keywords: string[]): HotItem[] {
  if (keywords.length === 0) return items;

  const lowerKeywords = keywords.map(k => k.toLowerCase());
  return items.filter(item => {
    const title = item.title.toLowerCase();
    return lowerKeywords.some(kw => title.includes(kw));
  });
}

/**
 * 格式化热搜输出
 */
export function formatHotboard(items: HotItem[], platform: string, keywords: string[]): string {
  const lines: string[] = [];

  lines.push(`🔥 ${platform.toUpperCase()} 热搜`);
  if (keywords.length > 0) {
    lines.push(`   关键词: ${keywords.join(', ')}`);
  }
  lines.push(`   更新时间: ${new Date().toLocaleString('zh-CN')}`);
  lines.push('');

  if (items.length === 0) {
    lines.push('   未找到匹配的热搜');
    return lines.join('\n');
  }

  items.forEach(item => {
    const hot = Number(item.hot_value) > 10000
      ? `${(Number(item.hot_value) / 10000).toFixed(1)}万`
      : item.hot_value;
    lines.push(`   ${String(item.index).padStart(2)}. ${item.title} (${hot})`);
  });

  return lines.join('\n');
}
