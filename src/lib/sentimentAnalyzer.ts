/**
 * WC26 社交媒体情绪分析模块
 *
 * 职责：从热搜数据中提取球队相关讨论，分析情绪倾向。
 * 用于 AI 预测推荐的参考因素。
 */

import { fetchHotboard, type HotItem } from './hotboardApi';
import { readMatches } from './storage';
import { teamZhName } from './parser';

// ─── 情绪关键词库 ──────────────────────────────────────────────────────────────

/** 正面关键词 - 表示球队状态好、被看好 */
const POSITIVE_KEYWORDS = [
  '状态好', '状态佳', '状态火热', '连胜', '大胜', '强势', '出色', '精彩',
  '值得看好', '被看好', '热门', '夺冠热门', '表现好', '发挥出色',
  '伤病恢复', '主力回归', '士气高涨', '信心十足', '状态回升',
  '进攻犀利', '防守稳固', '配合默契', '战术得当', '教练给力',
];

/** 负面关键词 - 表示球队状态差、不被看好 */
const NEGATIVE_KEYWORDS = [
  '状态差', '状态低迷', '连败', '惨败', '低迷', '糟糕', '伤病',
  '主力缺阵', '停赛', '内讧', '矛盾', '换帅', '教练下课',
  '不被看好', '冷门', '爆冷', '翻车', '掉链子', '发挥失常',
  '防守漏洞', '进攻乏力', '配合生疏', '战术混乱', '士气低落',
];

/** 中性关键词 - 表示关注度高但无明显倾向 */
const NEUTRAL_KEYWORDS = [
  '比赛', '对阵', '对决', '焦点战', '生死战', '出线', '晋级',
  '小组赛', '淘汰赛', '决赛', '半决赛', '四分之一',
];

// ─── 类型定义 ──────────────────────────────────────────────────────────────────

export interface SentimentResult {
  team: string;
  teamZh: string;
  positive: number;
  negative: number;
  neutral: number;
  score: number;  // -1 到 1，正数表示正面情绪
  keywords: string[];
  sources: string[];
}

export interface TeamSentimentMap {
  [team: string]: SentimentResult;
}

// ─── 核心分析 ──────────────────────────────────────────────────────────────────

/**
 * 分析单条热搜的情绪倾向
 */
function analyzeHotItem(item: HotItem, teamName: string, teamZh: string): {
  sentiment: 'positive' | 'negative' | 'neutral' | 'none';
  matchedKeywords: string[];
} {
  const title = item.title.toLowerCase();
  const teamLower = teamName.toLowerCase();
  const teamZhLower = teamZh.toLowerCase();

  // 检查是否包含球队名
  const containsTeam = title.includes(teamLower) || title.includes(teamZhLower);
  if (!containsTeam) {
    return { sentiment: 'none', matchedKeywords: [] };
  }

  const matchedKeywords: string[] = [];
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  // 检查正面关键词
  for (const kw of POSITIVE_KEYWORDS) {
    if (title.includes(kw)) {
      positiveCount++;
      matchedKeywords.push(kw);
    }
  }

  // 检查负面关键词
  for (const kw of NEGATIVE_KEYWORDS) {
    if (title.includes(kw)) {
      negativeCount++;
      matchedKeywords.push(kw);
    }
  }

  // 检查中性关键词
  for (const kw of NEUTRAL_KEYWORDS) {
    if (title.includes(kw)) {
      neutralCount++;
      matchedKeywords.push(kw);
    }
  }

  // 判断情绪倾向
  if (positiveCount > negativeCount) return { sentiment: 'positive', matchedKeywords };
  if (negativeCount > positiveCount) return { sentiment: 'negative', matchedKeywords };
  if (neutralCount > 0) return { sentiment: 'neutral', matchedKeywords };
  
  // 默认中性（有球队名但无明显情绪词）
  return { sentiment: 'neutral', matchedKeywords: [] };
}

/**
 * 分析所有球队的情绪
 */
export async function analyzeAllTeams(): Promise<TeamSentimentMap> {
  const matches = readMatches();
  const allTeams = [...new Set(matches.flatMap(m => [m.teamA, m.teamB]))];
  
  const result: TeamSentimentMap = {};
  
  // 初始化所有球队
  for (const team of allTeams) {
    result[team] = {
      team,
      teamZh: teamZhName(team),
      positive: 0,
      negative: 0,
      neutral: 0,
      score: 0,
      keywords: [],
      sources: [],
    };
  }

  // 获取多个平台的热搜
  const platforms = ['weibo', 'zhihu', 'baidu'];
  
  for (const platform of platforms) {
    try {
      const data = await fetchHotboard(platform);
      if (!data.list) continue;

      for (const item of data.list) {
        for (const team of allTeams) {
          const teamZh = teamZhName(team);
          const analysis = analyzeHotItem(item, team, teamZh);
          
          if (analysis.sentiment !== 'none') {
            const sentiment = result[team];
            sentiment.sources.push(platform);
            
            if (analysis.sentiment === 'positive') {
              sentiment.positive++;
            } else if (analysis.sentiment === 'negative') {
              sentiment.negative++;
            } else {
              sentiment.neutral++;
            }
            
            sentiment.keywords.push(...analysis.matchedKeywords);
          }
        }
      }
    } catch (e) {
      // 热搜获取失败时静默跳过
    }
  }

  // 计算情绪得分
  for (const team of allTeams) {
    const s = result[team];
    const total = s.positive + s.negative + s.neutral;
    if (total > 0) {
      s.score = (s.positive - s.negative) / total;
    }
    // 去重关键词
    s.keywords = [...new Set(s.keywords)].slice(0, 5);
    s.sources = [...new Set(s.sources)];
  }

  return result;
}

/**
 * 分析单个球队的情绪
 */
export async function analyzeTeam(teamName: string): Promise<SentimentResult | null> {
  const all = await analyzeAllTeams();
  
  // 尝试精确匹配
  if (all[teamName]) return all[teamName];
  
  // 尝试模糊匹配
  const lower = teamName.toLowerCase();
  for (const [key, value] of Object.entries(all)) {
    if (key.toLowerCase().includes(lower) || value.teamZh.toLowerCase().includes(lower)) {
      return value;
    }
  }
  
  return null;
}

/**
 * 获取情绪排名（正面情绪最高的球队）
 */
export async function getSentimentRanking(): Promise<SentimentResult[]> {
  const all = await analyzeAllTeams();
  return Object.values(all)
    .filter(s => s.positive + s.negative + s.neutral > 0)
    .sort((a, b) => b.score - a.score);
}

// ─── 格式化输出 ──────────────────────────────────────────────────────────────

/**
 * 格式化单个球队的情绪分析
 */
export function formatSentiment(result: SentimentResult): string {
  const lines: string[] = [];
  
  const scoreEmoji = result.score > 0.3 ? '🟢' : result.score < -0.3 ? '🔴' : '🟡';
  const scoreText = result.score > 0 ? `+${(result.score * 100).toFixed(0)}%` : `${(result.score * 100).toFixed(0)}%`;
  
  lines.push(`${scoreEmoji} ${result.teamZh} (${result.team})`);
  lines.push(`   情绪得分: ${scoreText}`);
  lines.push(`   正面: ${result.positive} | 负面: ${result.negative} | 中性: ${result.neutral}`);
  
  if (result.keywords.length > 0) {
    lines.push(`   关键词: ${result.keywords.join(', ')}`);
  }
  
  if (result.sources.length > 0) {
    lines.push(`   来源: ${result.sources.join(', ')}`);
  }
  
  return lines.join('\n');
}

/**
 * 格式化所有球队的情绪排名
 */
export function formatSentimentRanking(results: SentimentResult[]): string {
  const lines: string[] = [];
  
  lines.push('\n📊 球队情绪排名');
  lines.push(`${'─'.repeat(50)}`);
  
  if (results.length === 0) {
    lines.push('   暂无数据');
    return lines.join('\n');
  }
  
  results.forEach((r, idx) => {
    const rank = String(idx + 1).padStart(2);
    const scoreEmoji = r.score > 0.3 ? '🟢' : r.score < -0.3 ? '🔴' : '🟡';
    const scoreText = r.score > 0 ? `+${(r.score * 100).toFixed(0)}%` : `${(r.score * 100).toFixed(0)}%`;
    lines.push(`   ${rank}. ${scoreEmoji} ${r.teamZh.padEnd(10)} ${scoreText.padStart(6)} (正${r.positive}/负${r.negative}/中${r.neutral})`);
  });
  
  return lines.join('\n');
}
