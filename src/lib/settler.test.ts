import { describe, it, expect } from 'vitest';
import { settleBet, settleAllBets, calcAccount } from './settler';
import { Bet, Match } from '../types';

function makeBet(overrides: Partial<Bet>): Bet {
  return {
    id: 'b1',
    matchId: 'm1',
    betType: '1X2',
    betSelection: 'TeamA',
    odds: 2.0,
    stake: 100,
    status: 'pending',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides
  };
}

const finishedMatch: Match = {
  id: 'match_1',
  group: 'Group A',
  teamA: 'Mexico',
  teamB: 'South Africa',
  scoreA: 2,
  scoreB: 1,
  date: '2026-06-01T00:00:00Z',
  stadium: 'Test',
  status: 'finished'
};

describe('settleBet', () => {
  it('settles 1X2 home win', () => {
    const bet: Bet = {
      id: 'b1',
      matchId: 'match_1',
      betType: '1X2',
      betSelection: 'Mexico',
      odds: 2,
      stake: 10,
      status: 'pending',
      createdAt: '2026-06-01T00:00:00Z'
    };
    expect(settleBet(bet, finishedMatch)).toBe('won');
  });

  it('settles handicap push as void', () => {
    const drawMatch: Match = { ...finishedMatch, scoreA: 1, scoreB: 1 };
    const bet: Bet = {
      id: 'b2',
      matchId: 'match_1',
      betType: 'handicap',
      betSelection: 'Mexico',
      odds: 1.9,
      stake: 10,
      status: 'pending',
      createdAt: '2026-06-01T00:00:00Z',
      metadata: { handicapValue: 0 }
    };
    expect(settleBet(bet, drawMatch)).toBe('void');
  });

  it('keeps custom bet status unchanged', () => {
    const bet: Bet = {
      id: 'b3',
      matchId: 'match_1',
      betType: 'custom',
      betSelection: 'Red card',
      odds: 5,
      stake: 10,
      status: 'won',
      createdAt: '2026-06-01T00:00:00Z'
    };
    expect(settleBet(bet, finishedMatch)).toBe('won');
  });
});

describe('settleAllBets', () => {
  it('re-settles when score correction changes outcome', () => {
    const bets: Bet[] = [{
      id: 'b1',
      matchId: 'match_1',
      betType: '1X2',
      betSelection: 'Mexico',
      odds: 2,
      stake: 10,
      status: 'lost',
      createdAt: '2026-06-01T00:00:00Z'
    }];

    const { updatedBets, changedCount } = settleAllBets(bets, [finishedMatch]);
    expect(updatedBets[0].status).toBe('won');
    expect(changedCount).toBe(1);
  });
});

describe('calcAccount', () => {
  it('no bets: balance equals initialDeposit', () => {
    const result = calcAccount([], 500);
    expect(result.netPnl).toBe(0);
    expect(result.balance).toBe(500);
    expect(result.pendingStake).toBe(0);
    expect(result.winRate).toBe(0);
  });

  it('won bet: profit = stake * (odds - 1)', () => {
    const bets = [makeBet({ status: 'won', stake: 100, odds: 2.0 })];
    const result = calcAccount(bets, 0);
    expect(result.netPnl).toBe(100);
    expect(result.totalWon).toBe(100);
    expect(result.winRate).toBe(1);
  });

  it('lost bet: profit = -stake', () => {
    const bets = [makeBet({ status: 'lost', stake: 100 })];
    const result = calcAccount(bets, 0);
    expect(result.netPnl).toBe(-100);
    expect(result.totalLost).toBe(100);
    expect(result.winRate).toBe(0);
  });

  it('void bet: no profit impact', () => {
    const bets = [makeBet({ status: 'void', stake: 100 })];
    const result = calcAccount(bets, 0);
    expect(result.netPnl).toBe(0);
    expect(result.totalVoid).toBe(1);
  });

  it('pending bet: pendingStake counted', () => {
    const bets = [makeBet({ status: 'pending', stake: 80 })];
    const result = calcAccount(bets, 0);
    expect(result.netPnl).toBe(0);
    expect(result.pendingStake).toBe(80);
  });

  it('mixed settled and pending bets', () => {
    const bets = [
      makeBet({ id: 'b1', status: 'won', stake: 100, odds: 2.0 }),
      makeBet({ id: 'b2', status: 'lost', stake: 50 }),
      makeBet({ id: 'b3', status: 'pending', stake: 30 })
    ];
    const result = calcAccount(bets, 1000);
    expect(result.netPnl).toBe(50);
    expect(result.balance).toBe(1050);
    expect(result.pendingStake).toBe(30);
    expect(result.betCount).toBe(3);
  });

  it('win rate calculation', () => {
    const bets = [
      makeBet({ id: 'b1', status: 'won' }),
      makeBet({ id: 'b2', status: 'won' }),
      makeBet({ id: 'b3', status: 'lost' }),
    ];
    const result = calcAccount(bets, 0);
    expect(result.winRate).toBeCloseTo(2 / 3);
  });
});
