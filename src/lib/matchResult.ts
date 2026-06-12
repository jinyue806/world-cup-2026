import { Match } from '../types';

export function getMatchWinner(
  match: Match,
  resolvedTeamA: string,
  resolvedTeamB: string
): string | null {
  if (match.status !== 'finished' || match.scoreA === null || match.scoreB === null) {
    return null;
  }

  if (match.winner) {
    const w = match.winner.toLowerCase();
    if (resolvedTeamA.toLowerCase().includes(w) || w.includes(resolvedTeamA.toLowerCase())) return resolvedTeamA;
    if (resolvedTeamB.toLowerCase().includes(w) || w.includes(resolvedTeamB.toLowerCase())) return resolvedTeamB;
  }

  if (match.scoreA > match.scoreB) return resolvedTeamA;
  if (match.scoreB > match.scoreA) return resolvedTeamB;
  return null;
}

export function getMatchLoser(
  match: Match,
  resolvedTeamA: string,
  resolvedTeamB: string
): string | null {
  const winner = getMatchWinner(match, resolvedTeamA, resolvedTeamB);
  if (!winner) return null;
  return winner === resolvedTeamA ? resolvedTeamB : resolvedTeamA;
}

export function inferWinnerFromScores(
  match: Match,
  scoreA: number,
  scoreB: number,
  llmWinner: string | null
): string | null {
  if (scoreA > scoreB) return isPlaceholderTeam(match.teamA) ? null : match.teamA;
  if (scoreB > scoreA) return isPlaceholderTeam(match.teamB) ? null : match.teamB;

  if (llmWinner && !isPlaceholderTeam(match.teamA) && !isPlaceholderTeam(match.teamB)) {
    const winnerLower = llmWinner.toLowerCase();
    if (match.teamA.toLowerCase().includes(winnerLower) || winnerLower.includes(match.teamA.toLowerCase())) {
      return match.teamA;
    }
    if (match.teamB.toLowerCase().includes(winnerLower) || winnerLower.includes(match.teamB.toLowerCase())) {
      return match.teamB;
    }
  }

  return null;
}

function isPlaceholderTeam(name: string): boolean {
  return (
    name.includes('Winner') ||
    name.includes('Runner-up') ||
    name.includes('3rd') ||
    name.includes('Loser')
  );
}

export interface ScoreSyncResult {
  scoreA: number | null;
  scoreB: number | null;
  status: 'finished' | 'scheduled' | 'postponed';
  winner: string | null;
  summary: string;
}

export interface ValidatedScoreUpdate {
  scoreA: number;
  scoreB: number;
  winner: string | null;
}

export function validateScoreSyncResult(
  result: ScoreSyncResult,
  match: Match
): string | null {
  if (result.status !== 'finished') {
    return null;
  }

  if (result.scoreA === null || result.scoreB === null) {
    return 'LLM reported match as finished but could not parse valid scores.';
  }

  if (!Number.isInteger(result.scoreA) || !Number.isInteger(result.scoreB)) {
    return 'Scores must be whole numbers.';
  }

  if (result.scoreA < 0 || result.scoreB < 0) {
    return 'Scores cannot be negative.';
  }

  if (result.scoreA > 20 || result.scoreB > 20) {
    return 'Scores look unreasonably high.';
  }

  const inferredWinner = inferWinnerFromScores(match, result.scoreA, result.scoreB, result.winner);

  const isKnockoutRound = [
    'Round of 32',
    'Round of 16',
    'Quarterfinals',
    'Semifinals',
    'Third Place Match',
    'Final'
  ].includes(match.group);

  if (isKnockoutRound && result.scoreA === result.scoreB && !inferredWinner && !result.winner) {
    return 'Knockout match ended in a draw but no penalty/extra-time winner was provided.';
  }

  if (
    result.winner &&
    inferredWinner &&
    result.scoreA !== result.scoreB &&
    !teamNamesMatch(result.winner, inferredWinner)
  ) {
    return 'LLM winner does not match the reported score.';
  }

  return null;
}

export function toValidatedScoreUpdate(
  result: ScoreSyncResult,
  match: Match
): ValidatedScoreUpdate {
  const scoreA = result.scoreA as number;
  const scoreB = result.scoreB as number;
  const winner = inferWinnerFromScores(match, scoreA, scoreB, result.winner) ?? result.winner;

  return { scoreA, scoreB, winner };
}

function teamNamesMatch(a: string, b: string): boolean {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  return aLower === bLower || aLower.includes(bLower) || bLower.includes(aLower);
}
