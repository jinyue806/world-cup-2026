import fs from 'fs';
import path from 'path';
import { Match, Bet, Predictions } from '../types';

const DATA_DIR = path.join(process.cwd(), 'data');
const BETS_PATH = path.join(DATA_DIR, 'bets.json');
const PREDICTIONS_PATH = path.join(DATA_DIR, 'predictions.json');
const MATCHES_PATH = path.join(DATA_DIR, 'matches.json');

const STATIC_SCHEDULE_PATH = path.join(__dirname, '..', 'data', 'worldcup2026.json');

function atomicWriteJson(filePath: string, data: unknown): void {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  fs.renameSync(tmpPath, filePath);
}

/**
 * 确保数据目录和文件存在（幂等，可多次调用）
 */
let initDone = false;
export function ensureDataDir(): void {
  if (initDone) return;
  initDone = true;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(BETS_PATH)) {
    atomicWriteJson(BETS_PATH, []);
  }

  if (!fs.existsSync(PREDICTIONS_PATH)) {
    atomicWriteJson(PREDICTIONS_PATH, {
      groupStandings: {},
      bestThirdTeams: [],
      bracket: {}
    });
  }

  if (!fs.existsSync(MATCHES_PATH)) {
    try {
      if (fs.existsSync(STATIC_SCHEDULE_PATH)) {
        let rawStatic = fs.readFileSync(STATIC_SCHEDULE_PATH, 'utf-8');
        if (rawStatic.charCodeAt(0) === 0xFEFF) rawStatic = rawStatic.slice(1);
        const staticData = JSON.parse(rawStatic);
        atomicWriteJson(MATCHES_PATH, staticData.matches);
      } else {
        atomicWriteJson(MATCHES_PATH, []);
      }
    } catch (e) {
      console.error('Failed to copy static schedule to matches.json:', e);
      atomicWriteJson(MATCHES_PATH, []);
    }
  }
}

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
}

export function readBets(): Bet[] {
  ensureDataDir();
  try {
    const data = stripBom(fs.readFileSync(BETS_PATH, 'utf-8'));
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function writeBets(bets: Bet[]): void {
  ensureDataDir();
  atomicWriteJson(BETS_PATH, bets);
}

export function appendBet(newBet: Bet): void {
  ensureDataDir();
  let bets: Bet[] = [];
  try {
    const data = fs.readFileSync(BETS_PATH, 'utf-8');
    bets = JSON.parse(data);
  } catch {
    bets = [];
  }
  bets.push(newBet);
  atomicWriteJson(BETS_PATH, bets);
}

export function readPredictions(): Predictions {
  ensureDataDir();
  try {
    const data = stripBom(fs.readFileSync(PREDICTIONS_PATH, 'utf-8'));
    return JSON.parse(data);
  } catch {
    return { groupStandings: {}, bestThirdTeams: [], bracket: {}, lastFetchAt: 0 };
  }
}

export function writePredictions(predictions: Predictions): void {
  ensureDataDir();
  atomicWriteJson(PREDICTIONS_PATH, predictions);
}

export function readMatches(): Match[] {
  ensureDataDir();
  try {
    const data = stripBom(fs.readFileSync(MATCHES_PATH, 'utf-8'));
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function writeMatches(matches: Match[]): void {
  ensureDataDir();
  atomicWriteJson(MATCHES_PATH, matches);
}
