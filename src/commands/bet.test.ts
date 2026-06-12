import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const BETS_PATH = path.join(DATA_DIR, 'bets.json');
const MATCHES_PATH = path.join(DATA_DIR, 'matches.json');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

beforeEach(() => {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  // 写入测试比赛数据
  fs.writeFileSync(MATCHES_PATH, JSON.stringify([
    { id: 'match_1', group: 'Group A', teamA: '墨西哥', teamB: '南非', scoreA: null, scoreB: null, date: '2026-06-11T12:00:00Z', stadium: 'A', status: 'scheduled' },
    { id: 'match_2', group: 'Group A', teamA: '韩国', teamB: '捷克', scoreA: 2, scoreB: 1, date: '2026-06-11T15:00:00Z', stadium: 'B', status: 'finished' },
    { id: 'match_3', group: 'Group B', teamA: '巴西', teamB: '阿根廷', scoreA: null, scoreB: null, date: '2026-06-12T12:00:00Z', stadium: 'C', status: 'scheduled' },
  ], null, 2));
  fs.writeFileSync(BETS_PATH, '[]');
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ initialDeposit: 1000 }));
});

afterEach(() => {
  if (fs.existsSync(BETS_PATH)) fs.unlinkSync(BETS_PATH);
  if (fs.existsSync(MATCHES_PATH)) fs.unlinkSync(MATCHES_PATH);
  if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH);
});

describe('cmdAddBet', () => {
  it('adds bet with match ID', () => {
    const { execSync } = require('child_process');
    const result = execSync('npx tsx src/cli.ts add-bet --match match_1 --type 1X2 --selection 墨西哥 --odds 2.0 --stake 100', { encoding: 'utf-8', cwd: process.cwd() });
    expect(result).toContain('✅ 注单已添加');
    expect(result).toContain('墨西哥 vs 南非');
    const bets = JSON.parse(fs.readFileSync(BETS_PATH, 'utf-8'));
    expect(bets).toHaveLength(1);
    expect(bets[0].betType).toBe('1X2');
    expect(bets[0].odds).toBe(2);
    expect(bets[0].stake).toBe(100);
  });

  it('adds bet with team name match', () => {
    const { execSync } = require('child_process');
    const result = execSync('npx tsx src/cli.ts add-bet --match "巴西 vs 阿根廷" --type handicap --selection 巴西 --odds 1.9 --stake 80', { encoding: 'utf-8', cwd: process.cwd() });
    expect(result).toContain('✅ 注单已添加');
    expect(result).toContain('巴西 vs 阿根廷');
    const bets = JSON.parse(fs.readFileSync(BETS_PATH, 'utf-8'));
    expect(bets).toHaveLength(1);
    expect(bets[0].matchId).toBe('match_3');
  });

  it('auto-settles on finished match', () => {
    const { execSync } = require('child_process');
    const result = execSync('npx tsx src/cli.ts add-bet --match match_2 --type 1X2 --selection 韩国 --odds 2.5 --stake 50', { encoding: 'utf-8', cwd: process.cwd() });
    expect(result).toContain('已赢');
    const bets = JSON.parse(fs.readFileSync(BETS_PATH, 'utf-8'));
    expect(bets[0].status).toBe('won');
  });

  it('rejects invalid match', () => {
    const { execSync } = require('child_process');
    try {
      execSync('npx tsx src/cli.ts add-bet --match match_999 --type 1X2 --selection X --odds 2 --stake 100', { encoding: 'utf-8', cwd: process.cwd() });
      expect.fail('should throw');
    } catch (e: any) {
      expect(e.stderr || e.message).toContain('找不到比赛');
    }
  });
});

describe('cmdDeleteBet', () => {
  it('deletes a bet', () => {
    const { execSync } = require('child_process');
    execSync('npx tsx src/cli.ts add-bet --match match_1 --type 1X2 --selection 墨西哥 --odds 2.0 --stake 100', { encoding: 'utf-8', cwd: process.cwd() });
    const bets = JSON.parse(fs.readFileSync(BETS_PATH, 'utf-8'));
    const betId = bets[0].id;
    const result = execSync(`npx tsx src/cli.ts delete-bet --id ${betId}`, { encoding: 'utf-8', cwd: process.cwd() });
    expect(result).toContain('已删除注单');
    const after = JSON.parse(fs.readFileSync(BETS_PATH, 'utf-8'));
    expect(after).toHaveLength(0);
  });
});
