/**
 * WC26 投注平台 API 客户端
 *
 * 数据源：yhnm381.com（吉祥体育）
 * API 域名：a.vx9a.com
 *
 * 职责：获取世界杯比赛列表、赔率、联赛信息。
 */

const API_BASE = 'https://a.vx9a.com';

/** 世界杯 2026 联赛 ID */
const WORLDCUP_LEAGUE_ID = 17663;

/** 足球 Sport ID */
const SPORT_FOOTBALL = 1;

// ─── Error Classes ──────────────────────────────────────────────────────────

export class BettingApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly apiCode?: string,
  ) {
    super(message);
    this.name = 'BettingApiError';
  }
}

export class NetworkError extends BettingApiError {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class HttpError extends BettingApiError {
  constructor(statusCode: number, message?: string) {
    super(message || `HTTP ${statusCode}`, statusCode);
    this.name = 'HttpError';
  }
}

export class ApiError extends BettingApiError {
  constructor(apiCode: string, message: string) {
    super(message, undefined, apiCode);
    this.name = 'ApiError';
  }
}

export class ParseError extends BettingApiError {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Team {
  name: string;
  id: number;
  logo?: string;
}

export interface OddsOption {
  name: string;
  label: string;
  type: number;
  odds: number;
  baseOdds: number;
}

export interface Market {
  id: number;
  name: string;
  options: OddsOption[];
  line?: string;
}

export interface BettingMatch {
  id: number;
  leagueId: number;
  leagueName: string;
  teamA: Team;
  teamB: Team;
  beginTime: number;
  markets: Market[];
  status: number;
  animationUrl?: string;
}

export interface League {
  id: number;
  name: string;
  sportId: number;
  regionId: number;
  regionName: string;
  logo?: string;
  matchCount: number;
  isHot: boolean;
}

export interface Statistics {
  totalCount: number;
  singleBetCount: number;
  parlayCount: number;
  bySport: Record<number, number>;
}

// ─── API Response Types ─────────────────────────────────────────────────────

interface RawMatchResponse {
  success: boolean;
  code?: string;
  message?: string;
  data: {
    current: number;
    size: number;
    total: number;
    records: any[];
  };
}

interface RawLeagueResponse {
  success: boolean;
  code?: string;
  message?: string;
  data: any[];
}

interface RawStatsResponse {
  success: boolean;
  code?: string;
  message?: string;
  data: {
    tc: number;
    sl: Array<{
      ty: number;
      des: string;
      tc: number;
      ssl: Array<{ sid: number; c: number }>;
    }>;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * 安全提取嵌套属性，缺失时返回默认值
 */
function safeGet<T>(obj: any, path: string, fallback: T): T {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return fallback;
    current = current[key];
  }
  return current === undefined || current === null ? fallback : current as T;
}

/**
 * 验证必填字段，缺失时抛出 ParseError
 */
function requireFields(obj: any, fields: string[], context: string): void {
  for (const field of fields) {
    if (obj == null || obj[field] === undefined || obj[field] === null) {
      throw new ParseError(`${context}: 缺少必填字段 "${field}"`);
    }
  }
}

// ─── Core API ───────────────────────────────────────────────────────────────

/** 可重试的错误类型 */
function isRetryable(e: unknown): boolean {
  return e instanceof NetworkError || (e instanceof HttpError && e.statusCode === 429);
}

/** 延迟指定毫秒 */
function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/** 最大重试延迟 10 秒 */
const MAX_RETRY_DELAY = 10000;

/**
 * 带重试的通用 POST 请求
 *
 * - NetworkError: 指数退避重试（网络闪断）
 * - HttpError 429: 指数退避重试（限流）
 * - 其他错误: 直接抛出
 */
async function post<T>(
  path: string,
  body: Record<string, unknown>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Referer': 'https://yhnm381.com/',
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      lastError = new NetworkError(`网络请求失败: ${(e as Error).message}`, e as Error);
      if (attempt < maxRetries) {
        await delay(Math.min(baseDelay * Math.pow(2, attempt), MAX_RETRY_DELAY));
        continue;
      }
      throw lastError;
    }

    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch {}
      const err = new HttpError(res.status, `HTTP ${res.status} ${path}${detail ? ': ' + detail.slice(0, 200) : ''}`);

      if (isRetryable(err) && attempt < maxRetries) {
        await delay(baseDelay * Math.pow(2, attempt));
        continue;
      }
      throw err;
    }

    let json: any;
    try {
      json = await res.json();
    } catch (e) {
      throw new ParseError(`响应解析失败: ${(e as Error).message}`);
    }

    if (!json.success) {
      throw new ApiError(json.code || 'UNKNOWN', json.message || JSON.stringify(json));
    }

    if (json.data === undefined || json.data === null) {
      throw new ParseError(`${path}: 响应成功但 data 为空`);
    }

    return json.data;
  }

  throw lastError;
}

// ─── Parsers ────────────────────────────────────────────────────────────────

/**
 * 解析原始比赛数据为标准格式
 */
function parseMatch(raw: any): BettingMatch {
  if (raw == null || typeof raw !== 'object') {
    throw new ParseError('比赛数据格式无效');
  }

  const teams = safeGet<any[]>(raw, 'ts', []);
  if (teams.length < 2) {
    throw new ParseError(`比赛 ${raw.id}: 至少需要 2 支球队，实际 ${teams.length} 支`);
  }

  const markets = (safeGet<any[]>(raw, 'mg', [])).map((m: any) => ({
    id: safeGet(m, 'id', 0),
    name: safeGet(m, 'nm', ''),
    line: m?.li ?? undefined,
    options: (safeGet<any[]>(m, 'mks', [])).flatMap((mk: any) =>
      (safeGet<any[]>(mk, 'op', [])).map((op: any) => ({
        name: safeGet(op, 'na', ''),
        label: safeGet(op, 'nm', ''),
        type: safeGet(op, 'ty', 0),
        odds: safeGet(op, 'od', 0),
        baseOdds: safeGet(op, 'bod', 0),
      }))
    ),
  }));

  return {
    id: safeGet(raw, 'id', 0),
    leagueId: safeGet(raw, 'lg.id', 0),
    leagueName: safeGet(raw, 'lg.na', ''),
    teamA: { name: safeGet(teams[0], 'na', ''), id: safeGet(teams[0], 'id', 0), logo: teams[0]?.lurl },
    teamB: { name: safeGet(teams[1], 'na', ''), id: safeGet(teams[1], 'id', 0), logo: teams[1]?.lurl },
    beginTime: safeGet(raw, 'bt', 0),
    markets,
    status: safeGet(raw, 'ms', 0),
    animationUrl: safeGet(raw, 'as.0', undefined),
  };
}

/**
 * 解析联赛数据
 */
function parseLeague(raw: any): League {
  if (raw == null || typeof raw !== 'object') {
    throw new ParseError('联赛数据格式无效');
  }
  return {
    id: safeGet(raw, 'id', 0),
    name: safeGet(raw, 'na', ''),
    sportId: safeGet(raw, 'sid', 0),
    regionId: safeGet(raw, 'rid', 0),
    regionName: safeGet(raw, 'rnm', ''),
    logo: raw?.lurl,
    matchCount: safeGet(raw, 'mt', 0),
    isHot: !!raw?.hot,
  };
}

/**
 * 解析投注统计数据
 */
function parseStatistics(raw: any): Statistics {
  if (raw == null || typeof raw !== 'object') {
    throw new ParseError('统计数据格式无效');
  }

  const bySport: Record<number, number> = {};
  const sl = safeGet<any[]>(raw, 'sl', []);

  for (const group of sl) {
    const type = safeGet(group, 'ty', -1);
    if (type === 8) {
      // 非冠军赛事 = 单场统计
      for (const item of safeGet<any[]>(group, 'ssl', [])) {
        const sid = safeGet(item, 'sid', 0);
        const count = safeGet(item, 'c', 0);
        bySport[sid] = (bySport[sid] || 0) + count;
      }
    }
  }

  return {
    totalCount: safeGet(raw, 'tc', 0),
    singleBetCount: safeGet(
      sl.find((g: any) => g.ty === 8), 'tc', 0
    ),
    parlayCount: safeGet(
      sl.find((g: any) => g.ty === 2), 'tc', 0
    ),
    bySport,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * 获取世界杯比赛列表（含赔率）
 *
 * @param page - 页码（从 1 开始）
 * @param size - 每页数量（默认 50）
 * @returns 比赛列表
 */
export async function fetchWorldcupMatches(page = 1, size = 50): Promise<BettingMatch[]> {
  const data = await post<RawMatchResponse['data']>('/v1/match/getList', {
    size,
    languageType: 'CMN',
    orderBy: 0,
    type: 1,
    sportIds: [SPORT_FOOTBALL],
    oddsType: 1,
    current: page,
  });

  const records = safeGet<any[]>(data, 'records', []);
  return records.map(parseMatch);
}

/**
 * 获取所有世界杯比赛（自动分页）
 */
export async function fetchAllWorldcupMatches(): Promise<BettingMatch[]> {
  const all: BettingMatch[] = [];
  let page = 1;
  const pageSize = 50;

  while (true) {
    const matches = await fetchWorldcupMatches(page, pageSize);
    all.push(...matches);
    if (matches.length < pageSize) break;
    page++;
  }
  return all;
}

/**
 * 获取在售联赛列表
 */
export async function fetchLeagues(): Promise<League[]> {
  const data = await post<any[]>('/v1/match/getOnSaleLeagues', {
    languageType: 'CMN',
    type: 4,
  });
  return (data || []).reduce<League[]>((acc, raw) => {
    try {
      acc.push(parseLeague(raw));
    } catch {}
    return acc;
  }, []);
}

/**
 * 获取世界杯联赛信息
 */
export async function fetchWorldcupLeague(): Promise<League | null> {
  const leagues = await fetchLeagues();
  return leagues.find(l => l.id === WORLDCUP_LEAGUE_ID) || null;
}

/**
 * 获取投注统计
 */
export async function fetchStatistics(): Promise<Statistics> {
  const data = await post<RawStatsResponse['data']>('/v1/match/statistical', { languageType: 'CMN' });
  return parseStatistics(data);
}

/**
 * 将投注平台比赛数据转换为 wc26 内部 Match 格式
 */
export function toInternalMatch(bm: BettingMatch): {
  id: string;
  group: string;
  teamA: string;
  teamB: string;
  date: string;
  status: 'scheduled' | 'finished';
} {
  const date = bm.beginTime ? new Date(bm.beginTime).toISOString() : new Date().toISOString();
  return {
    id: `bet_${bm.id}`,
    group: bm.leagueName,
    teamA: bm.teamA.name,
    teamB: bm.teamB.name,
    date,
    status: bm.status === 5 ? 'finished' : 'scheduled',
  };
}
