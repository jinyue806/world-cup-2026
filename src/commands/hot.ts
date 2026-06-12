/**
 * WC26 热搜命令
 *
 * 职责：查询各平台热搜，支持自动关键词提取。
 */
import { fetchHotboard, formatHotboard } from '../lib/hotboardApi';
import { extractKeywordsFromBets, mergeKeywords } from '../lib/keywords';
import { readBets, readMatches } from '../lib/storage';

/**
 * cmdHot - 热搜查询
 *
 * 用法:
 *   hot                    自动从注单提取关键词 + 世界杯
 *   hot --platform zhihu   知乎热搜
 *   hot --keyword "梅西"   追加自定义关键词
 *   hot --no-auto          不自动提取，只用默认关键词
 */
export async function cmdHot(args: Record<string, string>): Promise<void> {
  const platform = args.platform || 'weibo';
  const noAuto = args['no-auto'] === 'true';
  const keywordStr = args.keyword || '';

  // 收集关键词
  let keywords: string[] = ['世界杯'];

  if (!noAuto) {
    const bets = readBets();
    const matches = readMatches();
    const autoKeywords = extractKeywordsFromBets(bets, matches);
    keywords = autoKeywords;
  }

  // 追加用户自定义关键词
  if (keywordStr) {
    const userKeywords = keywordStr.split(/[,，]/).map(k => k.trim()).filter(Boolean);
    keywords = [...new Set([...keywords, ...userKeywords])];
  }

  const keywordDisplay = keywords.length > 1 ? keywords.join(', ') : keywords[0];
  console.log(`🔍 正在获取 ${platform} 热搜（关键词: ${keywordDisplay}）...`);

  try {
    const data = await fetchHotboard(platform);
    const output = formatHotboard(data.list, platform);
    console.log(output);
  } catch (e) {
    console.error(`❌ ${(e as Error).message}`);
    process.exit(1);
  }
}
