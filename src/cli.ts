import fs from 'fs';
import path from 'path';
import { ensureDataDir } from './lib/storage';
import { parseArgs, ensureStandingsFresh } from './commands/helpers';
import { cmdAddBet, cmdDeleteBet, cmdImportBets } from './commands/bet';
import { cmdUpdateMatch, cmdListMatches, cmdStatus } from './commands/match';
import { cmdQuery, cmdListBets, cmdStandings, cmdFetchStandings } from './commands/query';
import { cmdBracket, cmdPredictions, cmdSetGroupStandings, cmdSetBracket } from './commands/bracket';
import { cmdInit, cmdSettle, cmdDeposit, cmdReset, cmdCheckAndNotify } from './commands/admin';
import { cmdOdds } from './commands/odds';
import { cmdAnalytics } from './commands/analytics';

function cmdHelp() {
  const helpPath = path.join(__dirname, '..', 'references', 'help.txt');
  try {
    console.log(fs.readFileSync(helpPath, 'utf-8'));
  } catch {
    console.log('⚠️  帮助文件未找到，请参考 references/commands.md');
  }
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
      cmdQuery();
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
    case 'odds':
      cmdOdds(named).catch(e => { console.error(`❌ ${e.message}`); process.exit(1); });
      break;
    case 'analytics':
      cmdAnalytics(named);
      break;
    case 'import-bets':
      cmdImportBets(named);
      break;
    case 'check-and-notify':
      cmdCheckAndNotify();
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
