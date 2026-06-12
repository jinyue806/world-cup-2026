/**
 * WC26 导出报表命令
 *
 * 职责：支持 CSV/JSON 格式导出注单和统计。
 */
import { readBets, readMatches } from '../lib/storage';
import { teamZhName } from '../lib/parser';
import { calcAccount } from '../lib/settler';
import { loadConfig } from './helpers';
import fs from 'fs';
import path from 'path';

/**
 * cmdExport - 导出报表
 *
 * 用法:
 *   export                             导出所有注单（JSON）
 *   export --format csv                导出 CSV 格式
 *   export --format json               导出 JSON 格式
 *   export --bettor <名字>             按投注人筛选
 *   export --status <won|lost|pending> 按状态筛选
 *   export --output <path>             指定输出文件
 */
export function cmdExport(args: Record<string, string>): void {
  const format = args.format || 'json';
  const bettorFilter = args.bettor;
  const statusFilter = args.status;
  const outputPath = args.output;

  let bets = readBets();
  const matches = readMatches();

  // 应用筛选
  if (bettorFilter) {
    bets = bets.filter(b => b.bettorId === bettorFilter);
  }
  if (statusFilter) {
    bets = bets.filter(b => b.status === statusFilter);
  }

  if (bets.length === 0) {
    console.log('📭 没有符合条件的注单');
    return;
  }

  // 准备导出数据
  const exportData = bets.map(bet => {
    const match = matches.find(m => m.id === bet.matchId);
    return {
      id: bet.id,
      match: match ? `${teamZhName(match.teamA)} vs ${teamZhName(match.teamB)}` : bet.matchId,
      group: match?.group || '',
      betType: bet.betType,
      selection: bet.betSelection,
      odds: bet.odds,
      stake: bet.stake,
      status: bet.status,
      profit: bet.status === 'won' ? bet.stake * (bet.odds - 1) :
              bet.status === 'lost' ? -bet.stake : 0,
      bettor: bet.bettorId || 'self',
      createdAt: bet.createdAt,
    };
  });

  // 生成输出
  let output: string;
  let ext: string;

  if (format === 'csv') {
    output = generateCSV(exportData);
    ext = 'csv';
  } else {
    output = JSON.stringify(exportData, null, 2);
    ext = 'json';
  }

  // 确定输出路径
  let finalPath = outputPath;
  if (!finalPath) {
    const timestamp = new Date().toISOString().slice(0, 10);
    finalPath = path.join(process.cwd(), 'data', `export_${timestamp}.${ext}`);
  }

  // 写入文件
  fs.writeFileSync(finalPath, output, 'utf-8');
  console.log(`✅ 已导出 ${bets.length} 注注单到: ${finalPath}`);

  // 显示统计摘要
  const config = loadConfig();
  const account = calcAccount(bets, config.initialDeposit);
  console.log(`\n📊 导出摘要`);
  console.log(`   总注数: ${bets.length}`);
  console.log(`   已赢: ${bets.filter(b => b.status === 'won').length}`);
  console.log(`   已输: ${bets.filter(b => b.status === 'lost').length}`);
  console.log(`   待结算: ${bets.filter(b => b.status === 'pending').length}`);
  console.log(`   净收益: ${account.netPnl >= 0 ? '+' : ''}${account.netPnl.toFixed(2)}`);
}

/**
 * 生成 CSV 内容
 */
function generateCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const lines = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(h => {
      const val = row[h];
      // 处理包含逗号或引号的值
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    lines.push(values.join(','));
  }

  return lines.join('\n');
}
