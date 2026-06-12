import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Match } from '../types';
import { teamZhName } from '../lib/parser';
import { readPredictions, writePredictions } from '../lib/storage';
import { fetchStandings } from '../lib/worldcupApi';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');

export function loadConfig(): { initialDeposit: number } {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('⚠️  读取配置失败，使用默认值:', (e as Error).message);
  }
  return { initialDeposit: 0 };
}

export function saveConfig(config: { initialDeposit: number }): void {
  const tmpPath = `${CONFIG_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2));
  fs.renameSync(tmpPath, CONFIG_PATH);
}

export function genId(): string {
  return crypto.randomBytes(8).toString('hex');
}

export function findMatchById(matches: Match[], id: string): Match | undefined {
  return matches.find(m => m.id === id);
}

export function resolveTeamForBet(match: Match, selection: string): string {
  const sel = selection.toLowerCase().trim();

  if (sel.startsWith('winner') || sel.startsWith('runner-up') || sel.startsWith('3rd') || sel.startsWith('loser')) {
    return selection;
  }

  const a = match.teamA.toLowerCase().trim();
  const b = match.teamB.toLowerCase().trim();

  if (sel === a || sel === '1' || sel === '主' || sel === '主胜') return match.teamA;
  if (sel === b || sel === '2' || sel === '客' || sel === '客胜') return match.teamB;

  const zhA = teamZhName(match.teamA).toLowerCase();
  const zhB = teamZhName(match.teamB).toLowerCase();
  if (sel === zhA) return match.teamA;
  if (sel === zhB) return match.teamB;

  return selection;
}

export function printMatch(m: Match, resolved?: { teamA: string; teamB: string }) {
  const tA = resolved?.teamA ?? m.teamA;
  const tB = resolved?.teamB ?? m.teamB;
  const score = m.status === 'finished' ? `${m.scoreA} - ${m.scoreB}` : 'vs';
  const status = m.status === 'finished' ? '✅' : '⏳';
  const winner = m.winner ? ` (${m.winner})` : '';
  console.log(`  ${status} [${m.id}] ${m.group} | ${tA} ${score} ${tB}${winner}`);
}

/**
 * 根据队名模糊匹配比赛
 */
export function findMatchByTeamName(matches: Match[], teamA: string, teamB: string): Match | undefined {
  const normalize = (s: string) => s.toLowerCase().trim();
  const a = normalize(teamA);
  const b = normalize(teamB);

  return matches.find(m => {
    const mA = normalize(m.teamA);
    const mB = normalize(m.teamB);
    const zhA = normalize(teamZhName(m.teamA));
    const zhB = normalize(teamZhName(m.teamB));

    return (mA.includes(a) || zhA.includes(a)) && (mB.includes(b) || zhB.includes(b));
  });
}

/**
 * 解析 "A vs B" 格式的比赛描述
 */
export function parseMatchDescription(text: string): { teamA: string; teamB: string } | null {
  const patterns = [
    /^(.+?)\s+(?:vs|v|VS|V)\s+(.+)$/,
    /^(.+?)\s+对\s+(.+)$/,
    /^(.+?)\s+打\s+(.+)$/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return { teamA: m[1].trim(), teamB: m[2].trim() };
  }
  return null;
}

export function parseArgs(args: string[]): { named: Record<string, string>; positional: string[] } {
  const named: Record<string, string> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        named[key] = next;
        i++;
      } else {
        named[key] = 'true';
      }
    } else {
      positional.push(arg);
    }
  }

  return { named, positional };
}

const STALENESS_MS = 30 * 60 * 1000;

export async function ensureStandingsFresh(): Promise<void> {
  const predictions = readPredictions();
  const lastFetch = predictions.lastFetchAt ?? 0;
  const age = Date.now() - lastFetch;
  if (age < STALENESS_MS) return;

  console.log('🔄 积分榜数据已过期，正在自动更新...');
  try {
    const data = await fetchStandings();
    let updated = 0;
    for (const [groupKey, teams] of Object.entries(data)) {
      if (!groupKey || groupKey === '') continue;
      const groupName = `Group ${groupKey}`;
      const sorted = teams
        .map(t => ({
          name: t.teamName,
          pts: Number(t.points) || 0,
          gd: (Number(t.goals) || 0) - (Number(t.goalsAgainst) || 0),
        }))
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd)
        .map(t => t.name);
      if (sorted.length > 0) {
        predictions.groupStandings[groupName] = sorted;
        updated++;
      }
    }
    predictions.lastFetchAt = Date.now();
    writePredictions(predictions);
    console.log(`✅ 积分榜已自动更新（${updated} 组）`);
  } catch (e) {
    console.log(`⚠️  自动更新失败: ${(e as Error).message}，使用缓存数据`);
  }
}
