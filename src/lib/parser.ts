import { readMatches } from './storage';
import { Match } from '../types';

const ZH: Record<string, string> = {
  'algeria': '阿尔及利亚',
  'argentina': '阿根廷',
  'australia': '澳大利亚',
  'austria': '奥地利',
  'belgium': '比利时',
  'brazil': '巴西',
  'canada': '加拿大',
  'cape verde': '佛得角',
  'colombia': '哥伦比亚',
  'croatia': '克罗地亚',
  'curacao': '库拉索',
  'curaçao': '库拉索',
  'denmark': '丹麦',
  'ecuador': '厄瓜多尔',
  'egypt': '埃及',
  'england': '英格兰',
  'france': '法国',
  'germany': '德国',
  'ghana': '加纳',
  'haiti': '海地',
  'iran': '伊朗',
  'iraq': '伊拉克',
  'ivory coast': '科特迪瓦',
  'jamaica': '牙买加',
  'japan': '日本',
  'jordan': '约旦',
  'mexico': '墨西哥',
  'morocco': '摩洛哥',
  'netherlands': '荷兰',
  'new zealand': '新西兰',
  'norway': '挪威',
  'panama': '巴拿马',
  'paraguay': '巴拉圭',
  'portugal': '葡萄牙',
  'qatar': '卡塔尔',
  'saudi arabia': '沙特阿拉伯',
  'scotland': '苏格兰',
  'senegal': '塞内加尔',
  'slovakia': '斯洛伐克',
  'south africa': '南非',
  'south korea': '韩国',
  'spain': '西班牙',
  'switzerland': '瑞士',
  'tunisia': '突尼斯',
  'usa': '美国',
  'ukraine': '乌克兰',
  'uruguay': '乌拉圭',
  'uzbekistan': '乌兹别克斯坦',
  'wales': '威尔士',
};

export function teamZhName(name: string): string {
  if (!name) return name;
  return ZH[name.toLowerCase().trim()] ?? name;
}

export interface ParsedBet {
  teamA: string;
  teamB: string;
  betType: string;
  selection: string;
  odds: number;
  stake: number;
  matchId: string | null;
}

function normalizeScore(s: string): string {
  return s.replace(/[:：]/g, '-').replace(/\s/g, '');
}

function guessBetType(text: string): string {
  if (text.includes('波胆')) return 'correct_score';
  if (text.includes('独赢') || text.includes('胜平负')) return '1X2';
  if (text.includes('让球') || text.includes('让分')) return 'handicap';
  if (text.includes('大小') || text.includes('大球') || text.includes('小球')) return 'over_under';
  return '1X2';
}

function resolveSelection(text: string, betType: string, teamA: string, teamB: string): string {
  const t = text.trim();

  if (betType === 'correct_score') {
    const scoreMatch = t.match(/(\d+[\-:：]\d+)/);
    if (scoreMatch) return normalizeScore(scoreMatch[1]);
  }

  if (betType === '1X2' || betType === 'handicap') {
    if (t.includes('和局') || t === 'X' || t === '平') return 'draw';
    if (t.includes(teamA) || t === '1' || t.includes('主')) return teamA;
    if (t.includes(teamB) || t === '2' || t.includes('客')) return teamB;
  }

  if (betType === 'over_under') {
    if (t.includes('大') || t.toLowerCase().includes('over')) return 'over';
    if (t.includes('小') || t.toLowerCase().includes('under')) return 'under';
  }

  return t;
}

export function parseBetText(text: string): ParsedBet | null {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return null;

  const firstLine = lines[0];

  const teamMatch = firstLine.match(/(.+?)\s*[vVv-versus VS]+\s*(.+?)\s/);
  if (!teamMatch) return null;

  const teamA = teamMatch[1].trim();
  const teamB = teamMatch[2].trim();

  const betType = guessBetType(firstLine);

  let selection = '';
  let odds = 0;
  let stake = 0;

  const selectionMatch = firstLine.match(/(?:波胆|独赢|胜平负|让球|大小)\s*(.+)/);
  if (selectionMatch) {
    const selText = selectionMatch[1].trim();
    const oddsMatch = selText.match(/(.+?)@([\d.]+)/);
    if (oddsMatch) {
      selection = resolveSelection(oddsMatch[1], betType, teamA, teamB);
      odds = parseFloat(oddsMatch[2]);
    } else {
      selection = resolveSelection(selText, betType, teamA, teamB);
    }
  }

  for (const line of lines) {
    const stakeMatch = line.match(/投注金额[：:]?\s*([\d,.]+)/);
    if (stakeMatch) stake = parseFloat(stakeMatch[1].replace(/,/g, ''));

    const oddsLine = line.match(/@([\d.]+)/);
    if (oddsLine && odds === 0) odds = parseFloat(oddsLine[1]);

    if (stake === 0) {
      const stakeMatch2 = line.match(/([\d,.]+)\s*(?:元|$)/);
      if (stakeMatch2 && parseFloat(stakeMatch2[1].replace(/,/g, '')) > 0) {
        stake = parseFloat(stakeMatch2[1].replace(/,/g, ''));
      }
    }
  }

  if (!selection || odds === 0 || stake === 0) return null;

  const matches = readMatches();
  const match = matches.find(m => {
    const mA = m.teamA.toLowerCase();
    const mB = m.teamB.toLowerCase();
    const zhA = teamZhName(m.teamA).toLowerCase();
    const zhB = teamZhName(m.teamB).toLowerCase();
    return (mA === teamA.toLowerCase() && mB === teamB.toLowerCase()) ||
           (mA === teamB.toLowerCase() && mB === teamA.toLowerCase()) ||
           (zhA === teamA.toLowerCase() && zhB === teamB.toLowerCase()) ||
           (zhA === teamB.toLowerCase() && zhB === teamA.toLowerCase());
  });

  return {
    teamA,
    teamB,
    betType,
    selection,
    odds,
    stake,
    matchId: match?.id ?? null,
  };
}

export function parseMultiBets(text: string): ParsedBet[] {
  const bets: ParsedBet[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  for (const line of lines) {
    if (line.match(/\s+[vV]\s+/) || line.match(/\s+vs\s+/i)) {
      const parsed = parseBetText(line);
      if (parsed) bets.push(parsed);
    }
  }

  if (bets.length === 0) {
    const blocks = text.split(/\n\s*\n/).filter(b => b.trim());
    for (const block of blocks) {
      const parsed = parseBetText(block);
      if (parsed) bets.push(parsed);
    }
  }

  return bets;
}
