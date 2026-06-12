/**
 * WC26 热搜 API 客户端
 *
 * 数据源：uapis.cn
 * API：GET /api/v1/misc/hotboard
 *
 * 职责：获取各平台热搜数据。
 * 支持 40+ 平台：weibo、zhihu、douyin、bilibili、baidu、toutiao 等。
 *
 * 认证：设置环境变量 UAPI_KEY 以追踪调用量。
 * export UAPI_KEY=uapi-a-xxxxx
 */

const API_BASE = 'https://uapis.cn/api/v1/misc';
const API_KEY = process.env.UAPI_KEY || '';

export type HotPlatform = string;

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
 * 获取热搜数据（默认模式：实时热搜）
 */
export async function fetchHotboard(platform: string = 'weibo'): Promise<HotboardResponse> {
  const url = `${API_BASE}/hotboard?type=${platform}`;
  const headers: Record<string, string> = {};
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`热搜 API 请求失败: ${res.status}`);
  }

  const json = await res.json() as any;
  if (json.code && json.code !== 'SUCCESS' && json.code !== '0') {
    throw new Error(`热搜 API 错误: ${json.message || json.code}`);
  }

  return json;
}

/**
 * 搜索历史热搜（搜索模式）
 */
export async function searchHotboard(
  platform: string,
  keyword: string,
  timeStart: number,
  timeEnd: number,
  limit = 50
): Promise<any> {
  const url = `${API_BASE}/hotboard?type=${platform}&keyword=${encodeURIComponent(keyword)}&time_start=${timeStart}&time_end=${timeEnd}&limit=${limit}`;
  const headers: Record<string, string> = {};
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`热搜搜索 API 请求失败: ${res.status}`);
  }

  const json = await res.json() as any;
  if (json.code && json.code !== 'SUCCESS' && json.code !== '0') {
    throw new Error(`热搜搜索 API 错误: ${json.message || json.code}`);
  }

  return json;
}

/**
 * 格式化热搜输出
 */
export function formatHotboard(items: HotItem[], platform: string): string {
  const lines: string[] = [];

  lines.push(`🔥 ${platform} 热搜`);
  lines.push('');

  if (items.length === 0) {
    lines.push('   无数据');
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
