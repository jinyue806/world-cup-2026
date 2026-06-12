import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchStandings, fetchSchedule } from './worldcupApi';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('fetchStandings', () => {
  it('returns parsed group standings on success', async () => {
    const mockData = {
      success: true,
      data: {
        A: [
          { teamName: 'Mexico', won: 1, draw: 0, loss: 0, total: 1, goals: 2, goalsAgainst: 1, points: 3 },
          { teamName: 'South Africa', won: 0, draw: 0, loss: 1, total: 1, goals: 1, goalsAgainst: 2, points: 0 },
        ],
      },
    };
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await fetchStandings();
    expect(result.A).toHaveLength(2);
    expect(result.A[0].teamName).toBe('Mexico');
    expect(result.A[0].points).toBe(3);
  });

  it('throws on HTTP error', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(fetchStandings()).rejects.toThrow('API 请求失败: 500');
  });

  it('throws on API error response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false, message: '参数错误' }),
    } as Response);

    await expect(fetchStandings()).rejects.toThrow('API 返回错误: 参数错误');
  });
});

describe('fetchSchedule', () => {
  it('returns schedule data on success', async () => {
    const mockData = {
      success: true,
      data: [{ mid: '123', man: 'Mexico', mhn: 'South Africa', mgt: '1718150400000' }],
    };
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await fetchSchedule('A');
    expect(result).toHaveLength(1);
    expect(result[0].mid).toBe('123');
  });

  it('returns empty array when data is null', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: null }),
    } as Response);

    const result = await fetchSchedule('A');
    expect(result).toEqual([]);
  });
});
