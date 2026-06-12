import { readMatches, readPredictions, writePredictions } from '../lib/storage';
import { resolveBracketMatches } from '../lib/bracketResolver';

export function cmdBracket() {
  const matches = readMatches();
  const predictions = readPredictions();
  const resolved = resolveBracketMatches('live', predictions, matches);

  const knockoutGroups = ['Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Third Place Match', 'Final'];

  for (const kg of knockoutGroups) {
    const kgMatches = resolved.filter(m => m.group === kg);
    if (kgMatches.length === 0) continue;

    console.log(`\n🏆 ${kg}`);
    for (const m of kgMatches) {
      const tA = m.teamA;
      const tB = m.teamB;
      const isPlaceholder = (t: string) => t.startsWith('Winner') || t.startsWith('Runner-up') || t.startsWith('3rd') || t.startsWith('Loser') || t.startsWith('Winner of');
      const tagA = isPlaceholder(tA) ? '❓' : '✅';
      const tagB = isPlaceholder(tB) ? '❓' : '✅';

      if (m.status === 'finished') {
        console.log(`  ✅ [${m.id}] ${tagA} ${tA} ${m.scoreA} - ${m.scoreB} ${tB} ${tagB}  →  ${m.winner ?? '...'}`);
      } else {
        console.log(`  ⏳ [${m.id}] ${tagA} ${tA} vs ${tB} ${tagB}`);
      }
    }
  }
}

export function cmdPredictions() {
  const predictions = readPredictions();

  console.log('\n📊 小组赛预测排名');
  const groups = Object.keys(predictions.groupStandings).sort();
  if (groups.length === 0) {
    console.log('  （空）用 set-group-standings 设置');
  } else {
    for (const g of groups) {
      const teams = predictions.groupStandings[g];
      console.log(`  ${g}: ${teams.join(' > ')}`);
    }
  }

  console.log('\n🏆 淘汰赛预测胜者');
  const bracket = Object.entries(predictions.bracket);
  if (bracket.length === 0) {
    console.log('  （空）用 set-bracket 设置');
  } else {
    for (const [matchId, winner] of bracket) {
      console.log(`  ${matchId}: ${winner}`);
    }
  }

  console.log('\n📋 最佳第三名');
  if (predictions.bestThirdTeams.length === 0) {
    console.log('  （空）');
  } else {
    console.log(`  ${predictions.bestThirdTeams.join(', ')}`);
  }
}

export function cmdSetGroupStandings(args: Record<string, string>) {
  const group = args.group;
  const teamsStr = args.teams;

  if (!group || !teamsStr) {
    console.error('❌ 用法: set-group-standings --group <Group A> --teams <队1,队2,队3,队4>');
    console.error('   示例: set-group-standings --group "Group A" --teams "Mexico,Denmark,South Korea,South Africa"');
    process.exit(1);
  }

  const teams = teamsStr.split(',').map(t => t.trim());
  if (teams.length < 2 || teams.length > 4) {
    console.error('❌ 需要 2-4 支队伍，逗号分隔');
    process.exit(1);
  }

  const predictions = readPredictions();
  predictions.groupStandings[group] = teams;
  writePredictions(predictions);

  console.log(`✅ ${group} 排名已设置: ${teams.join(' > ')}`);
}

export function cmdSetBracket(args: Record<string, string>) {
  const matchId = args.match;
  const winner = args.winner;

  if (!matchId || !winner) {
    console.error('❌ 用法: set-bracket --match <matchId> --winner <队名>');
    console.error('   示例: set-bracket --match match_73 --winner "Mexico"');
    process.exit(1);
  }

  const predictions = readPredictions();
  predictions.bracket[matchId] = winner;
  writePredictions(predictions);

  console.log(`✅ ${matchId} 预测胜者已设置: ${winner}`);
}
