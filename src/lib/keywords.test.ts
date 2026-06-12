import { describe, it, expect } from 'vitest';
import { extractKeywordsFromBets, mergeKeywords } from './keywords';

const sampleMatches = [
  { id: 'match_1', group: 'Group A', teamA: '墨西哥', teamB: '南非', scoreA: null, scoreB: null, date: '2026-06-11T12:00:00Z', stadium: 'A', status: 'scheduled' },
  { id: 'match_2', group: 'Group A', teamA: '韩国', teamB: '捷克', scoreA: null, scoreB: null, date: '2026-06-12T12:00:00Z', stadium: 'B', status: 'scheduled' },
  { id: 'match_3', group: 'Group B', teamA: '巴西', teamB: '阿根廷', scoreA: null, scoreB: null, date: '2026-06-13T12:00:00Z', stadium: 'C', status: 'scheduled' },
];

const sampleBets = [
  { id: 'bet_1', matchId: 'match_1', betType: '1X2' as const, betSelection: '墨西哥', odds: 2.0, stake: 100, status: 'pending' as const, createdAt: '2026-06-11T10:00:00Z' },
  { id: 'bet_2', matchId: 'match_2', betType: '1X2' as const, betSelection: '韩国', odds: 2.5, stake: 50, status: 'pending' as const, createdAt: '2026-06-11T11:00:00Z' },
];

describe('extractKeywordsFromBets', () => {
  it('extracts team names from bets', () => {
    const keywords = extractKeywordsFromBets(sampleBets, sampleMatches);
    expect(keywords).toContain('世界杯');
    expect(keywords).toContain('墨西哥');
    expect(keywords).toContain('南非');
    expect(keywords).toContain('韩国');
    expect(keywords).toContain('捷克');
  });

  it('deduplicates keywords', () => {
    const bets = [
      { id: 'bet_1', matchId: 'match_1', betType: '1X2' as const, betSelection: '墨西哥', odds: 2.0, stake: 100, status: 'pending' as const, createdAt: '2026-06-11T10:00:00Z' },
      { id: 'bet_2', matchId: 'match_1', betType: '1X2' as const, betSelection: '南非', odds: 2.5, stake: 50, status: 'pending' as const, createdAt: '2026-06-11T11:00:00Z' },
    ];
    const keywords = extractKeywordsFromBets(bets, sampleMatches);
    expect(keywords.filter(k => k === '墨西哥')).toHaveLength(1);
    expect(keywords.filter(k => k === '南非')).toHaveLength(1);
  });

  it('always includes 世界杯', () => {
    const keywords = extractKeywordsFromBets([], []);
    expect(keywords).toContain('世界杯');
  });
});

describe('mergeKeywords', () => {
  it('merges and deduplicates', () => {
    const result = mergeKeywords(['世界杯', '韩国'], ['韩国', '梅西']);
    expect(result).toContain('世界杯');
    expect(result).toContain('韩国');
    expect(result).toContain('梅西');
    expect(result.filter(k => k === '韩国')).toHaveLength(1);
  });
});
