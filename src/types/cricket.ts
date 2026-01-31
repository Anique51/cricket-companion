// Cricket Application Types

export interface Team {
  id: string;
  name: string;
  short_name: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  name: string;
  team_id: string;
  created_at: string;
}

export interface Match {
  id: string;
  team1_id: string;
  team2_id: string;
  total_overs: number;
  status: string;
  winner_team_id: string | null;
  result_description: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Innings {
  id: string;
  match_id: string;
  innings_number: number;
  batting_team_id: string;
  bowling_team_id: string;
  total_runs: number;
  total_wickets: number;
  total_overs_completed: number;
  total_extras: number;
  is_completed: boolean;
  created_at: string;
}

export interface Over {
  id: string;
  innings_id: string;
  over_number: number;
  bowler_id: string;
  runs_conceded: number;
  wickets_taken: number;
  is_completed: boolean;
  created_at: string;
}

export interface Delivery {
  id: string;
  over_id: string;
  innings_id: string;
  ball_number: number;
  is_legal_delivery: boolean;
  runs_scored: number;
  is_wide: boolean;
  is_no_ball: boolean;
  is_wicket: boolean;
  batsman_id: string;
  bowler_id: string;
  created_at: string;
}

export interface BatsmanInningsStats {
  id: string;
  innings_id: string;
  batsman_id: string;
  runs_scored: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  is_out: boolean;
  batting_order: number;
  created_at: string;
}

export interface BowlerInningsStats {
  id: string;
  innings_id: string;
  bowler_id: string;
  overs_bowled: number;
  runs_conceded: number;
  wickets_taken: number;
  wides: number;
  no_balls: number;
  created_at: string;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  innings_id: string | null;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
}

// Scoring Action Types
export type ScoringAction = 'dot' | 'four' | 'six' | 'wide' | 'noball' | 'wicket';

// Match State
export interface MatchState {
  match: Match | null;
  currentInnings: Innings | null;
  currentOver: Over | null;
  currentBatsman: Player | null;
  currentBowler: Player | null;
  batsmanStats: BatsmanInningsStats | null;
  bowlerStats: BowlerInningsStats | null;
  deliveries: Delivery[];
  legalBallCount: number;
  isProcessingDelivery: boolean;
}

// Dashboard Stats
export interface PlayerCareerStats {
  player_id: string;
  player_name: string;
  team_name: string;
  total_runs: number;
  total_wickets: number;
  total_fours: number;
  total_sixes: number;
  matches_played: number;
}

export interface TeamStats {
  team_id: string;
  team_name: string;
  matches_played: number;
  matches_won: number;
  win_percentage: number;
}

// Match-scoped stats for completed match scorecards
export interface MatchBattingStats {
  id: string;
  match_id: string;
  innings_number: number;
  team_id: string;
  player_id: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  is_out: boolean;
  dismissal_type: string | null;
  batting_order: number;
  created_at: string;
}

export interface MatchBowlingStats {
  id: string;
  match_id: string;
  innings_number: number;
  team_id: string;
  player_id: string;
  overs: number;
  balls: number;
  runs_conceded: number;
  wickets: number;
  wides: number;
  no_balls: number;
  created_at: string;
}