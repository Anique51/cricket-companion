// Local Match Engine - Derives all state from events
// NO async operations in scoring path - instant UI updates

import type { DeliveryEvent, DeliveryEventType, LocalMatch, LocalInnings, LocalPlayer, LocalBatsmanState, LocalBowlerState } from './localDb';

// ============== DERIVED STATE TYPES ==============

export interface BatsmanStats {
  playerId: string;
  playerName: string;
  runsScored: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  battingOrder: number;
}

export interface BowlerStats {
  playerId: string;
  playerName: string;
  oversBowled: number;
  ballsBowled: number;
  runsConceded: number;
  wicketsTaken: number;
  wides: number;
  noBalls: number;
}

export interface OverDelivery {
  id: string;
  eventType: DeliveryEventType;
  runsScored: number;
  isLegalDelivery: boolean;
  isWide: boolean;
  isNoBall: boolean;
  isWicket: boolean;
  batsmanId: string;
  bowlerId: string;
}

export interface InningsState {
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  totalWickets: number;
  totalOversCompleted: number;
  currentOverBalls: number;
  totalExtras: number;
  isCompleted: boolean;
  currentOverNumber: number;
  currentOverDeliveries: OverDelivery[];
  batsmanStats: Map<string, BatsmanStats>;
  bowlerStats: Map<string, BowlerStats>;
  dismissedBatsmanIds: Set<string>;
  currentBatsmanId: string | null;
  currentBowlerId: string | null;
}

export interface MatchState {
  match: LocalMatch;
  currentInningsNumber: number;
  innings1: InningsState | null;
  innings2: InningsState | null;
  currentInnings: InningsState | null;
  target: number | null; // For 2nd innings
}

// ============== STATE DERIVATION FROM EVENTS ==============

function createEmptyInningsState(
  inningsNumber: number,
  battingTeamId: string,
  bowlingTeamId: string
): InningsState {
  return {
    inningsNumber,
    battingTeamId,
    bowlingTeamId,
    totalRuns: 0,
    totalWickets: 0,
    totalOversCompleted: 0,
    currentOverBalls: 0,
    totalExtras: 0,
    isCompleted: false,
    currentOverNumber: 1,
    currentOverDeliveries: [],
    batsmanStats: new Map(),
    bowlerStats: new Map(),
    dismissedBatsmanIds: new Set(),
    currentBatsmanId: null,
    currentBowlerId: null,
  };
}

function eventToOverDelivery(event: DeliveryEvent): OverDelivery {
  const isWide = event.eventType === 'WIDE';
  const isNoBall = event.eventType === 'NO_BALL' || 
                   event.eventType === 'NO_BALL_FOUR' || 
                   event.eventType === 'NO_BALL_SIX';
  const isWicket = event.eventType === 'WICKET';

  return {
    id: event.id,
    eventType: event.eventType,
    runsScored: event.runsScored,
    isLegalDelivery: event.isLegalDelivery,
    isWide,
    isNoBall,
    isWicket,
    batsmanId: event.batsmanId,
    bowlerId: event.bowlerId,
  };
}

export function deriveInningsState(
  events: DeliveryEvent[],
  inningsNumber: number,
  battingTeamId: string,
  bowlingTeamId: string,
  playerNames: Map<string, string>,
  batsmenState: LocalBatsmanState[],
  bowlersState: LocalBowlerState[]
): InningsState {
  const state = createEmptyInningsState(inningsNumber, battingTeamId, bowlingTeamId);
  
  // Initialize batsman stats from state
  batsmenState
    .filter(b => b.inningsNumber === inningsNumber)
    .forEach(b => {
      state.batsmanStats.set(b.playerId, {
        playerId: b.playerId,
        playerName: playerNames.get(b.playerId) || 'Unknown',
        runsScored: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        isOut: false,
        battingOrder: b.battingOrder,
      });
    });

  // Initialize bowler stats from state
  bowlersState
    .filter(b => b.inningsNumber === inningsNumber)
    .forEach(b => {
      state.bowlerStats.set(b.playerId, {
        playerId: b.playerId,
        playerName: playerNames.get(b.playerId) || 'Unknown',
        oversBowled: 0,
        ballsBowled: 0,
        runsConceded: 0,
        wicketsTaken: 0,
        wides: 0,
        noBalls: 0,
      });
    });

  // Process events in order
  let currentOverNumber = 1;
  let legalBallsInOver = 0;
  let currentOverDeliveries: OverDelivery[] = [];

  for (const event of events) {
    const delivery = eventToOverDelivery(event);
    
    // Update runs
    state.totalRuns += event.runsScored;
    
    // Update extras
    if (delivery.isWide || delivery.isNoBall) {
      state.totalExtras += 1; // The +1 for wide/no-ball
    }

    // Update wickets
    if (delivery.isWicket) {
      state.totalWickets += 1;
      state.dismissedBatsmanIds.add(event.batsmanId);
    }

    // Update batsman stats
    let batsmanStat = state.batsmanStats.get(event.batsmanId);
    if (!batsmanStat) {
      // Create new batsman stat if not exists
      batsmanStat = {
        playerId: event.batsmanId,
        playerName: playerNames.get(event.batsmanId) || 'Unknown',
        runsScored: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        isOut: false,
        battingOrder: state.batsmanStats.size + 1,
      };
      state.batsmanStats.set(event.batsmanId, batsmanStat);
    }

    // Wides don't add to batsman runs or balls faced
    if (!delivery.isWide) {
      batsmanStat.runsScored += event.runsScored - (delivery.isNoBall ? 1 : 0); // Subtract the no-ball extra
      if (event.isLegalDelivery) {
        batsmanStat.ballsFaced += 1;
      }
    }

    // Count fours and sixes
    if (event.eventType === 'FOUR' || event.eventType === 'NO_BALL_FOUR') {
      batsmanStat.fours += 1;
    }
    if (event.eventType === 'SIX' || event.eventType === 'NO_BALL_SIX') {
      batsmanStat.sixes += 1;
    }
    
    if (delivery.isWicket) {
      batsmanStat.isOut = true;
    }

    // Update bowler stats
    let bowlerStat = state.bowlerStats.get(event.bowlerId);
    if (!bowlerStat) {
      bowlerStat = {
        playerId: event.bowlerId,
        playerName: playerNames.get(event.bowlerId) || 'Unknown',
        oversBowled: 0,
        ballsBowled: 0,
        runsConceded: 0,
        wicketsTaken: 0,
        wides: 0,
        noBalls: 0,
      };
      state.bowlerStats.set(event.bowlerId, bowlerStat);
    }

    bowlerStat.runsConceded += event.runsScored;
    if (delivery.isWicket) {
      bowlerStat.wicketsTaken += 1;
    }
    if (delivery.isWide) {
      bowlerStat.wides += 1;
    }
    if (delivery.isNoBall) {
      bowlerStat.noBalls += 1;
    }

    // Track over progress
    if (event.overNumber !== currentOverNumber) {
      // Over changed - recalculate for current over
      currentOverNumber = event.overNumber;
      currentOverDeliveries = [];
      legalBallsInOver = 0;
    }

    currentOverDeliveries.push(delivery);
    
    if (event.isLegalDelivery) {
      legalBallsInOver += 1;
      bowlerStat.ballsBowled += 1;
    }

    // Check over completion
    if (legalBallsInOver >= 6) {
      state.totalOversCompleted += 1;
      bowlerStat.oversBowled += 1;
      // Don't reset here - wait for next over's first ball
    }

    state.currentBatsmanId = delivery.isWicket ? null : event.batsmanId;
    state.currentBowlerId = event.bowlerId;
  }

  state.currentOverNumber = currentOverNumber;
  state.currentOverBalls = legalBallsInOver >= 6 ? 0 : legalBallsInOver;
  state.currentOverDeliveries = legalBallsInOver >= 6 ? [] : currentOverDeliveries;

  return state;
}

// ============== SCORING HELPERS ==============

export function getEventTypeForAction(
  action: 'dot' | 'four' | 'six' | 'wide' | 'noball' | 'noball_four' | 'noball_six' | 'wicket'
): { eventType: DeliveryEventType; runs: number; isLegal: boolean } {
  switch (action) {
    case 'dot':
      return { eventType: 'DOT', runs: 0, isLegal: true };
    case 'four':
      return { eventType: 'FOUR', runs: 4, isLegal: true };
    case 'six':
      return { eventType: 'SIX', runs: 6, isLegal: true };
    case 'wide':
      return { eventType: 'WIDE', runs: 1, isLegal: false };
    case 'noball':
      return { eventType: 'NO_BALL', runs: 1, isLegal: false };
    case 'noball_four':
      return { eventType: 'NO_BALL_FOUR', runs: 5, isLegal: false }; // 1 + 4
    case 'noball_six':
      return { eventType: 'NO_BALL_SIX', runs: 7, isLegal: false }; // 1 + 6
    case 'wicket':
      return { eventType: 'WICKET', runs: 0, isLegal: true };
  }
}

export function calculateRunRate(runs: number, overs: number, balls: number): number {
  const totalOvers = overs + balls / 6;
  if (totalOvers === 0) return 0;
  return runs / totalOvers;
}

export function calculateRequiredRunRate(
  target: number,
  currentRuns: number,
  totalOvers: number,
  oversCompleted: number,
  ballsInCurrentOver: number
): number {
  const remainingRuns = target - currentRuns;
  const remainingOvers = totalOvers - oversCompleted - ballsInCurrentOver / 6;
  if (remainingOvers <= 0) return Infinity;
  return remainingRuns / remainingOvers;
}

export function formatOvers(overs: number, balls: number): string {
  return `${overs}.${balls}`;
}

// ============== CHECK CONDITIONS ==============

export function checkInningsEnd(
  state: InningsState,
  totalOvers: number,
  teamSize: number
): { ended: boolean; reason: 'OVERS_COMPLETE' | 'ALL_OUT' | null } {
  if (state.totalOversCompleted >= totalOvers) {
    return { ended: true, reason: 'OVERS_COMPLETE' };
  }
  
  // All out = all batsmen dismissed (in single-batsman model, that's all players)
  if (state.totalWickets >= teamSize) {
    return { ended: true, reason: 'ALL_OUT' };
  }
  
  return { ended: false, reason: null };
}

export function checkChasingWin(
  currentRuns: number,
  targetRuns: number | null
): boolean {
  if (targetRuns === null) return false;
  return currentRuns >= targetRuns;
}

export function calculateMatchResult(
  innings1: InningsState,
  innings2: InningsState,
  team1Name: string,
  team2Name: string,
  team1Id: string,
  teamSize: number
): { winnerId: string | null; resultDescription: string } {
  const target = innings1.totalRuns + 1;
  
  if (innings2.totalRuns >= target) {
    // Chasing team won
    const wicketsRemaining = Math.max(teamSize - innings2.totalWickets, 0);
    return {
      winnerId: innings2.battingTeamId,
      resultDescription: `${innings2.battingTeamId === team1Id ? team1Name : team2Name} Won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`
    };
  } else {
    // Batting first team won
    const runsDiff = innings1.totalRuns - innings2.totalRuns;
    return {
      winnerId: innings1.battingTeamId,
      resultDescription: `${innings1.battingTeamId === team1Id ? team1Name : team2Name} Won by ${runsDiff} run${runsDiff !== 1 ? 's' : ''}`
    };
  }
}
