/**
 * WC26 赔率展示命令
 *
 * 职责：从投注平台 API 获取实时赔率并展示。
 */
import { fetchWorldcupMatches, fetchAllWorldcupMatches, fetchWorldcupLeague, type BettingMatch, type Market } from '../lib/bettingApi';

/**
 * 格式化赔率显示
 */
function formatOdds(odds: number): string {
  return odds.toFixed(2);
}

/**
 * 格式化让球盘口
 */
function formatHandicap(line: string | undefined): string {
  if (!line) return '';
  const num = parseFloat(line);
  if (isNaN(num)) return line;
  return num > 0 ? `+${line}` : line;
}

/**
 * 打印单场比赛赔率
 */
function printMatchOdds(match: BettingMatch): void {
  const date = new Date(match.beginTime).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📅 ${date}  ${match.teamA.name} vs ${match.teamB.name}`);
  console.log(`${'─'.repeat(60)}`);

  for (const market of match.markets) {
    if (market.name === '让球') {
      console.log(`\n  📊 让球盘`);
      for (const opt of market.options) {
        const handicap = opt.label.includes('/') ? opt.label : formatHandicap(opt.label);
        console.log(`    ${opt.name.padEnd(6)} ${handicap.padStart(8)}  ${formatOdds(opt.odds)}`);
      }
    } else if (market.name === '大/小') {
      console.log(`\n  📊 大小球`);
      for (const opt of market.options) {
        console.log(`    ${opt.name.padEnd(6)} ${opt.label.padStart(8)}  ${formatOdds(opt.odds)}`);
      }
    } else if (market.name === '独赢') {
      console.log(`\n  📊 独赢 (1X2)`);
      for (const opt of market.options) {
        console.log(`    ${opt.name.padEnd(6)} ${''.padStart(8)}  ${formatOdds(opt.odds)}`);
      }
    } else {
      console.log(`\n  📊 ${market.name}`);
      for (const opt of market.options) {
        console.log(`    ${opt.name.padEnd(6)} ${opt.label.padStart(8)}  ${formatOdds(opt.odds)}`);
      }
    }
  }
}

/**
 * 打印比赛列表（简洁模式）
 */
function printMatchList(matches: BettingMatch[]): void {
  console.log(`\n⚽ 世界杯 2026 实时赔率 (${matches.length} 场)\n`);
  console.log(`${'时间'.padEnd(14)} ${'主队'.padEnd(12)} vs ${'客队'.padEnd(12)} ${'独赢'.padEnd(6)} ${'让球'.padEnd(8)} ${'大小球'.padEnd(6)}`);
  console.log('─'.repeat(70));

  for (const match of matches) {
    const date = new Date(match.beginTime).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const winMarket = match.markets.find(m => m.name === '独赢');
    const handicapMarket = match.markets.find(m => m.name === '让球');
    const ouMarket = match.markets.find(m => m.name === '大/小');

    const winOdds = winMarket?.options.find(o => o.name === match.teamA.name)?.odds || 0;
    const handicapLine = handicapMarket?.line || '';
    const handicapOdds = handicapMarket?.options.find(o => o.name === match.teamA.name)?.odds || 0;
    const ouLine = ouMarket?.options.find(o => o.name === '大')?.label || '';

    console.log(
      `${date.padEnd(14)} ` +
      `${match.teamA.name.padEnd(12)} vs ${match.teamB.name.padEnd(12)} ` +
      `${formatOdds(winOdds).padEnd(6)} ` +
      `${formatHandicap(handicapLine).padEnd(8)} ` +
      `${ouLine.padEnd(6)}`
    );
  }
}

/**
 * cmdOdds - 显示实时赔率
 *
 * 用法:
 *   odds                    显示所有世界杯比赛赔率列表
 *   odds --detail           显示详细赔率（含所有盘口）
 *   odds --match <id>       显示指定比赛的详细赔率
 *   odds --team <队名>      按队名筛选比赛
 */
export async function cmdOdds(named: Record<string, string>): Promise<void> {
  const detail = named.detail === 'true';
  const matchId = named.match;
  const teamFilter = named.team?.toLowerCase();

  console.log('🔍 正在获取世界杯赔率...');

  let matches: BettingMatch[];
  if (matchId) {
    const all = await fetchAllWorldcupMatches();
    matches = all.filter(m => String(m.id) === matchId);
    if (matches.length === 0) {
      console.error(`❌ 找不到比赛 ID: ${matchId}`);
      process.exit(1);
    }
  } else {
    matches = await fetchWorldcupMatches();
  }

  if (teamFilter) {
    matches = matches.filter(m =>
      m.teamA.name.toLowerCase().includes(teamFilter) ||
      m.teamB.name.toLowerCase().includes(teamFilter)
    );
  }

  if (matches.length === 0) {
    console.log('📭 没有找到匹配的比赛');
    return;
  }

  // 按开赛时间排序
  matches.sort((a, b) => a.beginTime - b.beginTime);

  if (detail || matchId) {
    for (const match of matches) {
      printMatchOdds(match);
    }
  } else {
    printMatchList(matches);
  }

  // 显示联赛信息
  try {
    const league = await fetchWorldcupLeague();
    if (league) {
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`📊 ${league.name} | ${league.matchCount} 场比赛 | ${league.regionName}`);
    }
  } catch {}
}
