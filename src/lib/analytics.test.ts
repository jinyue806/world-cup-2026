import { describe, it, expect } from 'vitest';
import {
  analyzeByDay,
  analyzeByType,
  analyzeStreaks,
  generateAnalytics,
  type Bet,
} from './analytics';

function makeBet(overrides: Partial<Bet>): Bet {
  return {
    id: 'bet_1',
    matchId: 'match_1',
    betType: '1X2',
    betSelection: 'Team A',
    odds: 2.0,
    stake: 100,
    status: 'pending',
    createdAt: '2026-06-11T12:00:00Z',
    ...overrides,
  };
}

describe('analyzeByDay', () => {
  it('groups bets by date', () => {
    const bets = [
      makeBet({ createdAt: '2026-06-11T10:00:00Z', status: 'won', stake: 100 }),
      makeBet({ id: 'bet_2', createdAt: '2026-06-11T15:00:00Z', status: 'lost', stake: 50 }),
      makeBet({ id: 'bet_3', createdAt: '2026-06-12T10:00:00Z', status: 'won', stake: 200 }),
    ];

    const result = analyzeByDay(bets);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-06-11');
    expect(result[0].bets).toBe(2);
    expect(result[0].won).toBe(1);
    expect(result[0].lost).toBe(1);
    expect(result[1].date).toBe('2026-06-12');
    expect(result[1].bets).toBe(1);
  });

  it('calculates daily profit correctly', () => {
    const bets = [
      makeBet({ createdAt: '2026-06-11T10:00:00Z', status: 'won', odds: 2.0, stake: 100 }),
      makeBet({ id: 'bet_2', createdAt: '2026-06-11T15:00:00Z', status: 'lost', stake: 50 }),
    ];

    const result = analyzeByDay(bets);
    expect(result[0].profit).toBe(50); // +100 - 50
    expect(result[0].stake).toBe(150);
  });

  it('handles empty bets', () => {
    const result = analyzeByDay([]);
    expect(result).toHaveLength(0);
  });
});

describe('analyzeByType', () => {
  it('groups bets by type', () => {
    const bets = [
      makeBet({ betType: '1X2', status: 'won', stake: 100 }),
      makeBet({ id: 'bet_2', betType: '1X2', status: 'lost', stake: 50 }),
      makeBet({ id: 'bet_3', betType: 'handicap', status: 'won', stake: 100 }),
    ];

    const result = analyzeByType(bets);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('1X2');
    expect(result[0].bets).toBe(2);
    expect(result[1].type).toBe('handicap');
    expect(result[1].bets).toBe(1);
  });

  it('calculates win rate per type', () => {
    const bets = [
      makeBet({ betType: '1X2', status: 'won' }),
      makeBet({ id: 'bet_2', betType: '1X2', status: 'won' }),
      makeBet({ id: 'bet_3', betType: '1X2', status: 'lost' }),
    ];

    const result = analyzeByType(bets);
    expect(result[0].winRate).toBeCloseTo(66.67, 0);
  });
});

describe('analyzeStreaks', () => {
  it('detects current win streak', () => {
    const bets = [
      makeBet({ status: 'lost', createdAt: '2026-06-10T10:00:00Z' }),
      makeBet({ id: 'bet_2', status: 'won', createdAt: '2026-06-11T10:00:00Z' }),
      makeBet({ id: 'bet_3', status: 'won', createdAt: '2026-06-12T10:00:00Z' }),
    ];

    const result = analyzeStreaks(bets);
    expect(result.current?.type).toBe('win');
    expect(result.current?.count).toBe(2);
    expect(result.longestWin).toBe(2);
  });

  it('detects current loss streak', () => {
    const bets = [
      makeBet({ status: 'won', createdAt: '2026-06-10T10:00:00Z' }),
      makeBet({ id: 'bet_2', status: 'lost', createdAt: '2026-06-11T10:00:00Z' }),
      makeBet({ id: 'bet_3', status: 'lost', createdAt: '2026-06-12T10:00:00Z' }),
      makeBet({ id: 'bet_4', status: 'lost', createdAt: '2026-06-13T10:00:00Z' }),
    ];

    const result = analyzeStreaks(bets);
    expect(result.current?.type).toBe('loss');
    expect(result.current?.count).toBe(3);
    expect(result.longestLoss).toBe(3);
  });

  it('handles empty bets', () => {
    const result = analyzeStreaks([]);
    expect(result.current).toBeNull();
    expect(result.longestWin).toBe(0);
    expect(result.longestLoss).toBe(0);
  });
});

describe('generateAnalytics', () => {
  it('generates complete summary', () => {
    const bets = [
      makeBet({ createdAt: '2026-06-11T10:00:00Z', status: 'won', odds: 2.0, stake: 100, betType: '1X2' }),
      makeBet({ id: 'bet_2', createdAt: '2026-06-11T15:00:00Z', status: 'lost', stake: 50, betType: '1X2' }),
      makeBet({ id: 'bet_3', createdAt: '2026-06-12T10:00:00Z', status: 'won', odds: 1.5, stake: 200, betType: 'handicap' }),
    ];

    const result = generateAnalytics(bets);
    expect(result.totalBets).toBe(3);
    expect(result.totalStake).toBe(350);
    expect(result.totalProfit).toBe(150); // +100 -50 +100
    expect(result.byDay).toHaveLength(2);
    expect(result.byType).toHaveLength(2);
  });
});
