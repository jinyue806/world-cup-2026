import { ensureDataDir } from './lib/storage';
import { parseArgs, ensureStandingsFresh } from './commands/helpers';
import { cmdAddBet, cmdDeleteBet, cmdImportBets } from './commands/bet';
import { cmdUpdateMatch, cmdListMatches, cmdStatus } from './commands/match';
import { cmdQuery, cmdListBets, cmdStandings, cmdFetchStandings } from './commands/query';
import { cmdBracket, cmdPredictions, cmdSetGroupStandings, cmdSetBracket } from './commands/bracket';
import { cmdInit, cmdSettle, cmdDeposit, cmdReset, cmdCheckAndNotify } from './commands/admin';
import { cmdHot } from './commands/hot';
import { cmdOdds } from './commands/odds';
import { cmdAnalytics } from './commands/analytics';
import { cmdSentiment } from './commands/sentiment';
import { cmdRecommend } from './commands/recommend';
import { cmdStreaks } from './commands/streaks';
import { cmdExport } from './commands/export';
import { cmdBacktest } from './commands/backtest';
import { cmdElo } from './commands/elo';

function cmdHelp() {
  console.log(`
⚽ WC26 世界杯投注账本 CLI

用法: npx tsx src/cli.ts <command> [options]

命令:
  init                                    初始化赛程数据
  add-bet                                 添加注单
    --match <matchId>                     比赛ID (如 match_1)
    --type <1X2|handicap|over_under|correct_score|custom>
    --selection <选项>                    投注选项
    --odds <赔率>                         赔率（每注独立）
    --stake <金额>                        下注金额
    --handicap <让球值>                   让球玩法必需
    --threshold <阈值>                    大小球玩法必需
    --bettor <名字>                       投注人（多用户时使用）
    --notes <备注>                        可选备注

  update-match                            更新比赛比分
    --match <matchId>                     比赛ID
    --score-a <分数>                      主队/Team A 分数
    --score-b <分数>                      客队/Team B 分数
    --winner <队名>                       可选，淘汰赛点球/加时胜者

  settle                                  结算所有已完成比赛的注单
  status                                  查看所有比赛和注单状态
    --group <Group A>                     按分组筛选
    --status <finished|scheduled>         按状态筛选

  query                                   查看盈亏统计
    --bettor <名字>                       按投注人筛选
  list-bets                               列出注单
    --status <pending|won|lost|void>      按状态筛选
    --bettor <名字>                       按投注人筛选
  list-matches                            列出比赛
    --group <Group A>                     按分组筛选
    --status <finished|scheduled>         按状态筛选

  deposit <金额>                          设置初始金额
  delete-bet                              删除注单
    --id <betId>                          注单ID
  reset                                   重置所有数据（需确认）
  standings                               查看小组积分榜
    --group <Group A>                     分组名

  ── 工具 ──
  odds                                    查看实时赔率
    --detail                               显示详细赔率（含所有盘口）
    --match <matchId>                      显示指定比赛的详细赔率
    --team <队名>                          按队名筛选比赛
  analytics                               数据分析报告
    --days <天数>                          最近 N 天
    --type <玩法>                          按玩法筛选 (1X2/handicap/over_under/correct_score)
  sentiment                               社交媒体情绪分析
    --team <队名>                          显示指定球队的情绪
  recommend                               AI 投注推荐
    --team <队名>                          显示指定球队相关推荐
  streaks                                 连胜/连败统计
    --notify                              显示需要通知的连胜/连败
  export                                  导出报表
    --format <csv|json>                   导出格式（默认 json）
    --bettor <名字>                       按投注人筛选
    --status <won|lost|pending>           按状态筛选
    --output <path>                       指定输出文件路径
  backtest                               回测历史数据
    --worldcup                           回测世界杯数据
    --year <年份>                         回测指定年份 (2018/2022)
    --strategy <策略名>                   回测指定策略
    --list                               列出所有策略
  elo                                    ELO 排名查询
    --match <主队> vs <客队>             分析比赛并显示估算赔率
    --team <队名>                        显示指定球队排名
  fetch-standings                         从 API 获取最新积分榜
  hot                                     查看热搜（自动从注单提取关键词）
    --platform <平台>                      weibo/zhihu/douyin/baidu/bilibili/toutiao
    --keyword <关键词>                     追加自定义关键词（逗号分隔）
    --no-auto                              不自动提取注单关键词
  import-bets                             批量导入下注记录
    --text <文本>                          直接粘贴下注文本
    --file <path>                          从文件读取
  check-and-notify                        检查比赛结果+结算+生成通知

  ── 淘汰赛 ──
  bracket                                 查看淘汰赛对阵（占位符已解析）
  predictions                             查看当前预测数据
  set-group-standings                     设置小组赛排名
    --group <Group A>                     分组名
    --teams <队1,队2,队3,队4>             逗号分隔的排名顺序
  set-bracket                             设置淘汰赛预测胜者
    --match <matchId>                     比赛ID (如 match_73)
    --winner <队名>                       预测胜者

  help                                    显示帮助
`);
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const { named, positional } = parseArgs(args.slice(1));

  ensureDataDir();

  const needsFresh = command === 'status' || command === 'standings' || command === 'bracket';
  const run = async () => {
    if (needsFresh) await ensureStandingsFresh();
    execCommand(command, named, positional);
  };

  run().catch((e: Error) => { console.error(`❌ ${e.message}`); process.exit(1); });
}

function execCommand(command: string | undefined, named: Record<string, string>, positional: string[]) {
  switch (command) {
    case 'init':
      cmdInit();
      break;
    case 'add-bet':
      cmdAddBet(named);
      break;
    case 'update-match':
      cmdUpdateMatch(named);
      break;
    case 'settle':
      cmdSettle();
      break;
    case 'status':
      cmdStatus(named);
      break;
    case 'query':
      cmdQuery(named);
      break;
    case 'list-bets':
      cmdListBets(named);
      break;
    case 'list-matches':
      cmdListMatches(named);
      break;
    case 'deposit':
      cmdDeposit(named, positional);
      break;
    case 'bracket':
      cmdBracket();
      break;
    case 'predictions':
      cmdPredictions();
      break;
    case 'set-group-standings':
      cmdSetGroupStandings(named);
      break;
    case 'set-bracket':
      cmdSetBracket(named);
      break;
    case 'delete-bet':
      cmdDeleteBet(named);
      break;
    case 'reset':
      cmdReset(named);
      break;
    case 'standings':
      cmdStandings(named);
      break;
    case 'fetch-standings':
      cmdFetchStandings().catch(e => { console.error(`❌ ${e.message}`); process.exit(1); });
      break;
    case 'hot':
      cmdHot(named).catch(e => { console.error(`❌ ${e.message}`); process.exit(1); });
      break;
    case 'import-bets':
      cmdImportBets(named);
      break;
    case 'check-and-notify':
      cmdCheckAndNotify();
      break;
    case 'odds':
      cmdOdds(named).catch(e => { console.error(`❌ ${e.message}`); process.exit(1); });
      break;
    case 'analytics':
      cmdAnalytics(named);
      break;
    case 'sentiment':
      cmdSentiment(named).catch(e => { console.error(`❌ ${e.message}`); process.exit(1); });
      break;
    case 'recommend':
      cmdRecommend(named).catch(e => { console.error(`❌ ${e.message}`); process.exit(1); });
      break;
    case 'streaks':
      cmdStreaks(named);
      break;
    case 'export':
      cmdExport(named);
      break;
    case 'backtest':
      cmdBacktest(named);
      break;
    case 'elo':
      cmdElo(named);
      break;
    case 'help':
    case undefined:
      cmdHelp();
      break;
    default:
      console.error(`❌ 未知命令: ${command}`);
      cmdHelp();
      process.exit(1);
  }
}

main();
