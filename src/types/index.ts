export interface Match {
  id: string;
  group: string;
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  /** Knockout winner when regular time is drawn (ET/PK). */
  winner?: string | null;
  date: string;
  stadium: string;
  status: 'scheduled' | 'finished';
}

export type BetType = '1X2' | 'handicap' | 'over_under' | 'correct_score' | 'custom';
export type BetStatus = 'pending' | 'won' | 'lost' | 'void';

export interface Bet {
  id: string;
  matchId: string;
  betType: BetType;
  betSelection: string; // e.g., "Germany", "+0.5", "Over 2.5", "2-1"
  odds: number;
  stake: number;
  status: BetStatus;
  createdAt: string;
  bettorId?: string;  // undefined | null → "self"
  metadata?: {
    handicapValue?: number; // e.g., -1.5, +0.5
    threshold?: number;     // e.g., 2.5
    bookmaker?: string;
    notes?: string;
    [key: string]: unknown;
  };
}

export interface Predictions {
  groupStandings: Record<string, string[]>; // e.g., { "Group A": ["Mexico", "South Africa", "South Korea"] }
  bestThirdTeams: string[];                 // List of group names, e.g., ["Group A", "Group C", ...]
  bracket: Record<string, string>;          // e.g., { "match_73": "Mexico" }
  lastFetchAt?: number;                     // Timestamp of last API fetch (ms)
}
