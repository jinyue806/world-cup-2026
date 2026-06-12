/**
 * WC26 热搜命令
 *
 * 职责：查询各平台热搜，支持关键词过滤。
 */
import { fetchHotboard, filterByKeywords, formatHotboard, type HotPlatform } from '../lib/hotboardApi';

const VALID_PLATFORMS: HotPlatform[] = ['weibo', 'zhihu', 'douyin', 'baidu', 'bilibili', 'toutiao'];

/**
 * cmdHot - 热搜查询
 *
 * 用法:
 *   hot                         默认：微博热搜 + 世界杯关键词
 *   hot --platform zhihu        知乎热搜
 *   hot --keyword "梅西"        自定义关键词
 *   hot --keyword "梅西,阿根廷" 多关键词
 *   hot --no-filter             不过滤，显示全部热搜
 */
export async function cmdHot(args: Record<string, string>): Promise<void> {
  const platform = (args.platform || 'weibo') as HotPlatform;
  const noFilter = args['no-filter'] === 'true';
  const keywordStr = args.keyword || '';

  // 验证平台
  if (!VALID_PLATFORMS.includes(platform)) {
    console.error(`❌ 不支持的平台: ${platform}`);
    console.error(`   可用平台: ${VALID_PLATFORMS.join(', ')}`);
    process.exit(1);
  }

  // 解析关键词
  let keywords: string[] = [];
  if (!noFilter) {
    keywords = keywordStr
      ? keywordStr.split(/[,，]/).map(k => k.trim()).filter(Boolean)
      : ['世界杯'];
  }

  console.log(`🔍 正在获取 ${platform} 热搜...`);

  try {
    const data = await fetchHotboard(platform);
    const filtered = filterByKeywords(data.list, keywords);
    const output = formatHotboard(filtered, platform, keywords);
    console.log(output);
  } catch (e) {
    console.error(`❌ ${(e as Error).message}`);
    process.exit(1);
  }
}
