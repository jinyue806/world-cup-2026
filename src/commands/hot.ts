/**
 * WC26 热搜命令
 *
 * 职责：查询各平台热搜。
 */
import { fetchHotboard, formatHotboard } from '../lib/hotboardApi';

/**
 * cmdHot - 热搜查询
 *
 * 用法:
 *   hot                    默认：微博热搜
 *   hot --platform zhihu   知乎热搜
 *   hot --platform douyin  抖音热搜
 */
export async function cmdHot(args: Record<string, string>): Promise<void> {
  const platform = args.platform || 'weibo';

  console.log(`🔍 正在获取 ${platform} 热搜...`);

  try {
    const data = await fetchHotboard(platform);
    const output = formatHotboard(data.list, platform);
    console.log(output);
  } catch (e) {
    console.error(`❌ ${(e as Error).message}`);
    process.exit(1);
  }
}
