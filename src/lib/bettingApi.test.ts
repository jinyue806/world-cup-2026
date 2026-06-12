import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchWorldcupMatches,
  fetchAllWorldcupMatches,
  fetchLeagues,
  fetchWorldcupLeague,
  fetchStatistics,
  toInternalMatch,
  BettingApiError,
  NetworkError,
  HttpError,
  ApiError,
  ParseError,
  type BettingMatch,
} from './bettingApi';

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(data: any) {
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true, data }),
  } as Response);
}

function mockFetchError(status: number, body?: string) {
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve(body || ''),
  } as Response);
}

function mockFetchNetworkError() {
  vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
}

function mockFetchJsonError() {
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: () => Promise.reject(new SyntaxError('Unexpected token')),
    text: () => Promise.resolve('not json'),
  } as Response);
}

const sampleMatch = {
  id: 4823411,
  lg: { id: 17663, na: '世界杯2026' },
  ts: [
    { na: '墨西哥', id: 1001, lurl: 'https://example.com/mexico.png' },
    { na: '南非', id: 1002, lurl: 'https://example.com/sa.png' },
  ],
  bt: 1781200800000,
  ms: 0,
  mg: [
    {
      nm: '让球',
      mks: [
        {
          op: [
            { na: '墨西哥', nm: '-0.5', ty: 1, od: 1.87, bod: 1.87 },
            { na: '南非', nm: '+0.5', ty: 2, od: 2.01, bod: 2.01 },
          ],
        },
      ],
    },
    {
      nm: '独赢',
      mks: [
        {
          op: [
            { na: '墨西哥', nm: '主', ty: 1, od: 1.59, bod: 1.59 },
            { na: '和', nm: '和', ty: 3, od: 4.55, bod: 4.55 },
            { na: '南非', nm: '客', ty: 2, od: 2.4, bod: 2.4 },
          ],
        },
      ],
    },
  ],
};

// ─── Error Classes ──────────────────────────────────────────────────────────

describe('Error Classes', () => {
  it('BettingApiError has correct name and message', () => {
    const err = new BettingApiError('test error');
    expect(err.name).toBe('BettingApiError');
    expect(err.message).toBe('test error');
    expect(err).toBeInstanceOf(Error);
  });

  it('NetworkError includes cause', () => {
    const cause = new TypeError('fetch failed');
    const err = new NetworkError('网络失败', cause);
    expect(err.name).toBe('NetworkError');
    expect(err.cause).toBe(cause);
    expect(err).toBeInstanceOf(BettingApiError);
  });

  it('HttpError includes status code', () => {
    const err = new HttpError(429, 'Too Many Requests');
    expect(err.name).toBe('HttpError');
    expect(err.statusCode).toBe(429);
    expect(err.message).toBe('Too Many Requests');
    expect(err).toBeInstanceOf(BettingApiError);
  });

  it('ApiError includes api code', () => {
    const err = new ApiError('5', 'Parameters error');
    expect(err.name).toBe('ApiError');
    expect(err.apiCode).toBe('5');
    expect(err).toBeInstanceOf(BettingApiError);
  });

  it('ParseError for malformed data', () => {
    const err = new ParseError('缺少字段');
    expect(err.name).toBe('ParseError');
    expect(err).toBeInstanceOf(BettingApiError);
  });
});

// ─── Retry Logic (post-level) ──────────────────────────────────────────────

describe('Retry Logic', () => {
  it('retries on NetworkError with exponential backoff', async () => {
    const match = { ...sampleMatch, id: 1 };
    let callCount = 0;

    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new TypeError('fetch failed');
      return {
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { current: 1, size: 50, total: 1, records: [match] },
        }),
      } as Response;
    });

    const result = await fetchWorldcupMatches();
    expect(result).toHaveLength(1);
    expect(callCount).toBe(2);
  });

  it('retries on 429 with exponential backoff', async () => {
    const match = { ...sampleMatch, id: 1 };
    let callCount = 0;

    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { ok: false, status: 429, text: () => Promise.resolve('') } as Response;
      }
      return {
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { current: 1, size: 50, total: 1, records: [match] },
        }),
      } as Response;
    });

    const result = await fetchWorldcupMatches();
    expect(result).toHaveLength(1);
    expect(callCount).toBe(2);
  });

  it('does NOT retry on 400/500 (non-retryable)', async () => {
    let callCount = 0;
    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      callCount++;
      return { ok: false, status: 500, text: () => Promise.resolve('') } as Response;
    });

    await expect(fetchWorldcupMatches()).rejects.toThrow(HttpError);
    expect(callCount).toBe(1);
  });

  it('does NOT retry on ApiError (business error)', async () => {
    let callCount = 0;
    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: () => Promise.resolve({ success: false, code: '5', message: '参数错误' }),
      } as Response;
    });

    await expect(fetchWorldcupMatches()).rejects.toThrow(ApiError);
    expect(callCount).toBe(1);
  });

  it('throws after max retries exceeded (network)', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
    await expect(fetchWorldcupMatches()).rejects.toThrow(NetworkError);
  }, 15000);

  it('throws after max retries exceeded (429)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 429, text: () => Promise.resolve('') } as Response);
    await expect(fetchWorldcupMatches()).rejects.toThrow(HttpError);
  }, 15000);
});

// ─── fetchWorldcupMatches ───────────────────────────────────────────────────

describe('fetchWorldcupMatches', () => {
  it('returns parsed matches on success', async () => {
    mockFetch({ current: 1, size: 10, total: 1, records: [sampleMatch] });

    const result = await fetchWorldcupMatches();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(4823411);
    expect(result[0].teamA.name).toBe('墨西哥');
    expect(result[0].teamB.name).toBe('南非');
    expect(result[0].leagueName).toBe('世界杯2026');
    expect(result[0].markets).toHaveLength(2);
    expect(result[0].markets[0].name).toBe('让球');
    expect(result[0].markets[0].options).toHaveLength(2);
  });

  it('throws HttpError on HTTP error', async () => {
    mockFetchError(500, 'Internal Server Error');
    await expect(fetchWorldcupMatches()).rejects.toThrow(HttpError);
  });

  it('throws ApiError on API error response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false, code: '5', message: '参数错误' }),
    } as Response);
    await expect(fetchWorldcupMatches()).rejects.toThrow(ApiError);
  });

  it('throws NetworkError on network failure', async () => {
    mockFetchNetworkError();
    await expect(fetchWorldcupMatches()).rejects.toThrow(NetworkError);
  }, 15000);

  it('throws ParseError on invalid JSON', async () => {
    mockFetchJsonError();
    await expect(fetchWorldcupMatches()).rejects.toThrow(ParseError);
  });

  it('throws ParseError when data is null', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: null }),
    } as Response);
    await expect(fetchWorldcupMatches()).rejects.toThrow(ParseError);
  });

  it('throws ParseError when match has < 2 teams', async () => {
    mockFetch({ current: 1, size: 10, total: 1, records: [{ id: 1, ts: [{ na: 'A' }] }] });
    await expect(fetchWorldcupMatches()).rejects.toThrow('至少需要 2 支球队');
  });
});

// ─── fetchAllWorldcupMatches ────────────────────────────────────────────────

describe('fetchAllWorldcupMatches', () => {
  it('returns all matches when single page', async () => {
    const match1 = { ...sampleMatch, id: 1 };
    const match2 = { ...sampleMatch, id: 2 };

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { current: 1, size: 50, total: 2, records: [match1, match2] },
      }),
    } as Response);

    const result = await fetchAllWorldcupMatches();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });

  it('paginates when multiple pages needed', async () => {
    const matches = Array.from({ length: 60 }, (_, i) => ({ ...sampleMatch, id: i + 1 }));
    let callCount = 0;

    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      callCount++;
      const start = (callCount - 1) * 50;
      const records = matches.slice(start, start + 50);
      return {
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { current: callCount, size: 50, total: 60, records },
        }),
      } as Response;
    });

    const result = await fetchAllWorldcupMatches();
    expect(result).toHaveLength(60);
    expect(callCount).toBe(2);
  });
});

// ─── fetchLeagues ───────────────────────────────────────────────────────────

describe('fetchLeagues', () => {
  it('returns parsed leagues', async () => {
    mockFetch([
      { id: 17663, na: '世界杯2026', sid: 1, rid: 106, rnm: '国际', mt: 70, hot: true },
      { id: 11274, na: 'NBA', sid: 3, rid: 84, rnm: '美国', mt: 50, hot: false },
    ]);

    const result = await fetchLeagues();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('世界杯2026');
    expect(result[0].matchCount).toBe(70);
    expect(result[0].isHot).toBe(true);
  });

  it('skips malformed league entries gracefully', async () => {
    mockFetch([null, { id: 1, na: 'Test', sid: 1, rid: 1, rnm: 'Region', mt: 10, hot: false }]);
    const result = await fetchLeagues();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });
});

// ─── fetchWorldcupLeague ────────────────────────────────────────────────────

describe('fetchWorldcupLeague', () => {
  it('returns worldcup league', async () => {
    mockFetch([
      { id: 17663, na: '世界杯2026', sid: 1, rid: 106, rnm: '国际', mt: 70, hot: true },
    ]);

    const result = await fetchWorldcupLeague();
    expect(result).not.toBeNull();
    expect(result!.id).toBe(17663);
  });

  it('returns null if worldcup not found', async () => {
    mockFetch([{ id: 999, na: 'Other League' }]);
    const result = await fetchWorldcupLeague();
    expect(result).toBeNull();
  });
});

// ─── fetchStatistics ────────────────────────────────────────────────────────

describe('fetchStatistics', () => {
  it('returns parsed statistics', async () => {
    mockFetch({
      tc: 1957,
      sl: [
        { ty: 8, des: '非冠军赛事', tc: 1872, ssl: [{ sid: 1, c: 632 }, { sid: 3, c: 153 }] },
        { ty: 2, des: '串关', tc: 1552, ssl: [] },
      ],
    });

    const result = await fetchStatistics();
    expect(result.totalCount).toBe(1957);
    expect(result.singleBetCount).toBe(1872);
    expect(result.parlayCount).toBe(1552);
    expect(result.bySport[1]).toBe(632);
    expect(result.bySport[3]).toBe(153);
  });
});

// ─── toInternalMatch ────────────────────────────────────────────────────────

describe('toInternalMatch', () => {
  it('converts betting match to internal format', () => {
    const bm: BettingMatch = {
      id: 4823411,
      leagueId: 17663,
      leagueName: '世界杯2026',
      teamA: { name: '墨西哥', id: 1001 },
      teamB: { name: '南非', id: 1002 },
      beginTime: 1781200800000,
      markets: [],
      status: 0,
    };

    const result = toInternalMatch(bm);
    expect(result.id).toBe('bet_4823411');
    expect(result.teamA).toBe('墨西哥');
    expect(result.teamB).toBe('南非');
    expect(result.status).toBe('scheduled');
  });

  it('marks finished matches correctly', () => {
    const bm: BettingMatch = {
      id: 1,
      leagueId: 17663,
      leagueName: '世界杯2026',
      teamA: { name: 'A', id: 1 },
      teamB: { name: 'B', id: 2 },
      beginTime: 0,
      markets: [],
      status: 5,
    };

    const result = toInternalMatch(bm);
    expect(result.status).toBe('finished');
  });
});
