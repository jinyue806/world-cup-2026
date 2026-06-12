import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchHotboard, filterByKeywords, formatHotboard } from './hotboardApi';

beforeEach(() => {
  vi.restoreAllMocks();
});

const sampleData = {
  type: 'weibo',
  update_time: '2026-06-12 18:00:00',
  list: [
    { index: 1, title: '世界杯在中国的收视率爆了', url: 'https://example.com/1', hot_value: '1178901' },
    { index: 2, title: '鸿蒙7', url: 'https://example.com/2', hot_value: '878773' },
    { index: 3, title: '梅西进球', url: 'https://example.com/3', hot_value: '500000' },
  ],
};

describe('fetchHotboard', () => {
  it('returns parsed hotboard data', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleData),
    } as Response);

    const result = await fetchHotboard('weibo');
    expect(result.type).toBe('weibo');
    expect(result.list).toHaveLength(3);
    expect(result.list[0].title).toBe('世界杯在中国的收视率爆了');
  });

  it('throws on HTTP error', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(fetchHotboard()).rejects.toThrow('热搜 API 请求失败: 500');
  });
});

describe('filterByKeywords', () => {
  it('filters by single keyword', () => {
    const result = filterByKeywords(sampleData.list, ['世界杯']);
    expect(result).toHaveLength(1);
    expect(result[0].title).toContain('世界杯');
  });

  it('filters by multiple keywords', () => {
    const result = filterByKeywords(sampleData.list, ['世界杯', '梅西']);
    expect(result).toHaveLength(2);
  });

  it('returns all items when keywords empty', () => {
    const result = filterByKeywords(sampleData.list, []);
    expect(result).toHaveLength(3);
  });

  it('is case insensitive', () => {
    const result = filterByKeywords(sampleData.list, ['世界杯']);
    expect(result).toHaveLength(1);
  });
});

describe('formatHotboard', () => {
  it('formats output correctly', () => {
    const output = formatHotboard(sampleData.list, 'weibo', ['世界杯']);
    expect(output).toContain('WEIBO 热搜');
    expect(output).toContain('关键词: 世界杯');
    expect(output).toContain('世界杯在中国的收视率爆了');
  });

  it('shows no match message when empty', () => {
    const output = formatHotboard([], 'weibo', ['世界杯']);
    expect(output).toContain('未找到匹配的热搜');
  });
});
