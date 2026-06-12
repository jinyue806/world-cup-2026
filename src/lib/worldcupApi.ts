const BASE = process.env.WC26_API_BASE || 'https://your-api-domain.com/worldcup';

export interface GroupStanding {
  teamName: string;
  won: number;
  draw: number;
  loss: number;
  total: number;
  goals: number;
  goalsAgainst: number;
  points: number;
}

export async function fetchStandings(): Promise<Record<string, GroupStanding[]>> {
  const res = await fetch(`${BASE}/tableDetailList?year=2026`);
  if (!res.ok) throw new Error(`API 请求失败: ${res.status}`);
  const json = await res.json() as any;
  if (!json.success) throw new Error(`API 返回错误: ${json.message}`);
  return json.data;
}

export async function fetchSchedule(groupTag: string): Promise<any[]> {
  const res = await fetch(`${BASE}/scheduleByList?groupTag=${groupTag}&year=2026`);
  if (!res.ok) throw new Error(`API 请求失败: ${res.status}`);
  const json = await res.json() as any;
  if (!json.success) throw new Error(`API 返回错误: ${json.message}`);
  return json.data ?? [];
}
