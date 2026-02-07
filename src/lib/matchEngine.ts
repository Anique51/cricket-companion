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

  // Process events in order - properly tracking overs
  let totalLegalBalls = 0;
  let currentOverDeliveries: OverDelivery[] = [];
  let lastProcessedOverNumber = 0;

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

    // Track over progress - use the stored overNumber to detect over changes
    if (event.overNumber !== lastProcessedOverNumber) {
      // New over started - reset current over deliveries
      currentOverDeliveries = [];
      lastProcessedOverNumber = event.overNumber;
    }

    currentOverDeliveries.push(delivery);
    
    if (event.isLegalDelivery) {
      totalLegalBalls += 1;
      bowlerStat.ballsBowled += 1;
    }
  }

  // Calculate completed overs and current over balls from total legal balls
  state.totalOversCompleted = Math.floor(totalLegalBalls / 6);
  state.currentOverBalls = totalLegalBalls % 6;
  
  // Current over number is completed overs + 1 (or same if just finished an over)
  state.currentOverNumber = state.totalOversCompleted + 1;
  
  // If we just completed an over (currentOverBalls is 0 and we have events), 
  // the current over deliveries should be empty (waiting for new over)
  if (state.currentOverBalls === 0 && events.length > 0) {
    state.currentOverDeliveries = [];
  } else {
    state.currentOverDeliveries = currentOverDeliveries;
  }

  // Update bowler overs from total balls
  state.bowlerStats.forEach(bowler => {
    bowler.oversBowled = Math.floor(bowler.ballsBowled / 6);
  });

  // Set current batsman and bowler from last event
  if (events.length > 0) {
    const lastEvent = events[events.length - 1];
    state.currentBatsmanId = lastEvent.eventType === 'WICKET' ? null : lastEvent.batsmanId;
    state.currentBowlerId = lastEvent.bowlerId;
  }

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
  team2Id: string,
  teamSize: number
): { winnerId: string | null; resultDescription: string } {
  const target = innings1.totalRuns + 1;
  
  // Determine which team batted first and second
  const battingFirstTeamId = innings1.battingTeamId;
  const battingSecondTeamId = innings2.battingTeamId;
  
  // Get team names based on IDs
  const battingFirstTeamName = battingFirstTeamId === team1Id ? team1Name : team2Name;
  const battingSecondTeamName = battingSecondTeamId === team1Id ? team1Name : team2Name;
  
  if (innings2.totalRuns >= target) {
    // Chasing team (batting second) won
    const wicketsRemaining = Math.max(teamSize - innings2.totalWickets, 0);
    return {
      winnerId: battingSecondTeamId,
      resultDescription: `${battingSecondTeamName} Won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`
    };
  } else {
    // Batting first team won (defended their total)
    const runsDiff = innings1.totalRuns - innings2.totalRuns;
    return {
      winnerId: battingFirstTeamId,
      resultDescription: `${battingFirstTeamName} Won by ${runsDiff} run${runsDiff !== 1 ? 's' : ''}`
    };
  }
}

// Calculate the correct over number for a new event
export function getNextOverNumber(events: DeliveryEvent[], inningsNumber: number): number {
  const inningsEvents = events.filter(e => e.inningsNumber === inningsNumber);
  const legalBalls = inningsEvents.filter(e => e.isLegalDelivery).length;
  // Over number is 1-indexed, so first over is 1, after 6 balls it becomes 2, etc.
  return Math.floor(legalBalls / 6) + 1;
}
