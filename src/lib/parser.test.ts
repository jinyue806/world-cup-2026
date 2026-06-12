import { describe, it, expect } from 'vitest';
import { teamZhName, parseBetText, parseMultiBets } from './parser';

describe('teamZhName', () => {
  it('maps English to Chinese', () => {
    expect(teamZhName('Mexico')).toBe('墨西哥');
    expect(teamZhName('South Korea')).toBe('韩国');
    expect(teamZhName('Germany')).toBe('德国');
  });

  it('is case-insensitive', () => {
    expect(teamZhName('mexico')).toBe('墨西哥');
    expect(teamZhName('MEXICO')).toBe('墨西哥');
  });

  it('returns original if no mapping', () => {
    expect(teamZhName('Unknown Team')).toBe('Unknown Team');
  });

  it('handles empty/null', () => {
    expect(teamZhName('')).toBe('');
    expect(teamZhName(null as any)).toBe(null);
  });

  it('trims whitespace', () => {
    expect(teamZhName('  Mexico  ')).toBe('墨西哥');
  });
});

describe('parseBetText', () => {
  it('parses 1X2 bet with Chinese team names', () => {
    const result = parseBetText('韩国 v 捷克 足球独赢 韩国@2.5 投注金额:100.00');
    expect(result).not.toBeNull();
    expect(result!.teamA).toBe('韩国');
    expect(result!.teamB).toBe('捷克');
    expect(result!.betType).toBe('1X2');
    expect(result!.odds).toBe(2.5);
    expect(result!.stake).toBe(100);
  });

  it('parses correct_score bet', () => {
    const result = parseBetText('韩国 v 捷克 足球波胆 1-2@11.0 投注金额:100.00');
    expect(result).not.toBeNull();
    expect(result!.betType).toBe('correct_score');
    expect(result!.selection).toBe('1-2');
    expect(result!.odds).toBe(11);
  });

  it('parses handicap bet', () => {
    const result = parseBetText('韩国 v 捷克 足球让球 韩国@1.9 投注金额:100.00');
    expect(result).not.toBeNull();
    expect(result!.betType).toBe('handicap');
  });

  it('parses over_under bet', () => {
    const result = parseBetText('韩国 v 捷克 足球大小 大@1.8 投注金额:100.00');
    expect(result).not.toBeNull();
    expect(result!.betType).toBe('over_under');
    expect(result!.selection).toBe('over');
  });

  it('parses draw selection', () => {
    const result = parseBetText('韩国 v 捷克 足球独赢 和局@3.05 投注金额:200.00');
    expect(result).not.toBeNull();
    expect(result!.selection).toBe('draw');
  });

  it('handles comma in stake', () => {
    const result = parseBetText('韩国 v 捷克 足球独赢 韩国@2.5 投注金额:1,000.00');
    expect(result).not.toBeNull();
    expect(result!.stake).toBe(1000);
  });

  it('returns null for empty input', () => {
    expect(parseBetText('')).toBeNull();
    expect(parseBetText('   ')).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(parseBetText('no teams here')).toBeNull();
  });

  it('returns null when missing odds', () => {
    expect(parseBetText('韩国 v 捷克 足球独赢 韩国 投注金额:100')).toBeNull();
  });

  it('extracts stake from odds-like number when no explicit stake', () => {
    const result = parseBetText('韩国 v 捷克 足球独赢 韩国@2.5');
    expect(result).not.toBeNull();
    expect(result!.stake).toBe(2.5);
  });
});

describe('parseMultiBets', () => {
  it('parses multiple bets from multi-line text', () => {
    const text = [
      '韩国 v 捷克 足球波胆 1-2@11.0 投注金额:100.00',
      '韩国 v 捷克 足球独赢 和局@3.05 投注金额:200.00',
    ].join('\n');
    const results = parseMultiBets(text);
    expect(results.length).toBe(2);
    expect(results[0].betType).toBe('correct_score');
    expect(results[1].selection).toBe('draw');
  });

  it('returns empty for no valid bets', () => {
    expect(parseMultiBets('')).toEqual([]);
    expect(parseMultiBets('no bets here')).toEqual([]);
  });

  it('skips malformed lines', () => {
    const text = [
      '韩国 v 捷克 足球独赢 韩国@2.5 投注金额:100',
      'this is garbage',
      '墨西哥 v 南非 足球独赢 墨西哥@1.8 投注金额:100',
    ].join('\n');
    const results = parseMultiBets(text);
    expect(results.length).toBe(2);
  });
});
