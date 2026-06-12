import { describe, it, expect } from 'vitest';
import { getMatchWinner, getMatchLoser, inferWinnerFromScores, validateScoreSyncResult } from './matchResult';
import { Match } from '../types';

const knockoutMatch: Match = {
  id: 'match_100',
  group: 'Semifinals',
  teamA: 'Brazil',
  teamB: 'France',
  scoreA: 1,
  scoreB: 1,
  winner: 'France',
  date: '2026-07-01T00:00:00Z',
  stadium: 'Test',
  status: 'finished'
};

describe('matchResult', () => {
  it('uses explicit winner on knockout draw', () => {
    expect(getMatchWinner(knockoutMatch, 'Brazil', 'France')).toBe('France');
    expect(getMatchLoser(knockoutMatch, 'Brazil', 'France')).toBe('Brazil');
  });

  it('infers winner from decisive score', () => {
    const match: Match = { ...knockoutMatch, scoreA: 2, scoreB: 1, winner: null };
    expect(inferWinnerFromScores(match, 2, 1, null)).toBe('Brazil');
  });

  it('returns null winner on draw without winner field', () => {
    const match: Match = { ...knockoutMatch, winner: null };
    expect(getMatchWinner(match, 'Brazil', 'France')).toBeNull();
  });
});

describe('validateScoreSyncResult', () => {
  const groupMatch: Match = {
    id: 'match_1',
    group: 'Group A',
    teamA: 'Mexico',
    teamB: 'South Africa',
    scoreA: null,
    scoreB: null,
    date: '2026-06-01T00:00:00Z',
    stadium: 'Test',
    status: 'scheduled'
  };

  it('accepts valid finished score', () => {
    const error = validateScoreSyncResult({
      status: 'finished',
      scoreA: 2,
      scoreB: 1,
      winner: 'Mexico',
      summary: 'Mexico wins'
    }, groupMatch);
    expect(error).toBeNull();
  });

  it('rejects negative scores', () => {
    const error = validateScoreSyncResult({
      status: 'finished',
      scoreA: -1,
      scoreB: 0,
      winner: null,
      summary: 'bad'
    }, groupMatch);
    expect(error).toContain('negative');
  });

  it('rejects knockout draw without winner', () => {
    const knockout: Match = { ...groupMatch, group: 'Final' };
    const error = validateScoreSyncResult({
      status: 'finished',
      scoreA: 1,
      scoreB: 1,
      winner: null,
      summary: 'draw'
    }, knockout);
    expect(error).toContain('draw');
  });
});
