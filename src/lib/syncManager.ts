// Sync Manager - Non-blocking Supabase sync for completed matches
// NEVER called during live scoring

import { supabase } from '@/integrations/supabase/client';
import type { LocalMatch, DeliveryEvent } from './localDb';
import { 
  getMatch, 
  getAllMatchEvents, 
  getMatchInnings, 
  getBatsmenState, 
  getBowlersState,
  saveMatch,
  getMatchesByStatus,
  getTeamPlayers,
  generateId
} from './localDb';
import { deriveInningsState } from './matchEngine';

export interface SyncResult {
  success: boolean;
  matchId: string;
  error?: string;
}

// Sync a completed match to Supabase
export async function syncMatchToSupabase(matchId: string): Promise<SyncResult> {
  try {
    // Get local match data
    const localMatch = await getMatch(matchId);
    if (!localMatch) {
      return { success: false, matchId, error: 'Match not found locally' };
    }

    // Get all events
    const events = await getAllMatchEvents(matchId);
    const inningsList = await getMatchInnings(matchId);

    // Get player names from local DB first
    const playerIds = new Set<string>();
    events.forEach(e => {
      playerIds.add(e.batsmanId);
      playerIds.add(e.bowlerId);
    });

    const playerNames = new Map<string, string>();
    
    // Load from local first
    const team1Players = await getTeamPlayers(localMatch.team1Id);
    const team2Players = await getTeamPlayers(localMatch.team2Id);
    [...team1Players, ...team2Players].forEach(p => {
      playerNames.set(p.id, p.name);
    });
    
    // Fallback to Supabase for any missing
    for (const playerId of playerIds) {
      if (!playerNames.has(playerId)) {
        const { data } = await supabase
          .from('players')
          .select('name')
          .eq('id', playerId)
          .single();
        if (data) {
          playerNames.set(playerId, data.name);
        }
      }
    }

    // 1. Check if match exists
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('id')
      .eq('id', localMatch.id)
      .maybeSingle();

    if (existingMatch) {
      const { error } = await supabase
        .from('matches')
        .update({
          status: 'completed',
          winner_team_id: localMatch.winnerId,
          result_description: localMatch.resultDescription,
          completed_at: localMatch.completedAt ? new Date(localMatch.completedAt).toISOString() : null,
        })
        .eq('id', localMatch.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('matches')
        .insert({
          id: localMatch.id,
          team1_id: localMatch.team1Id,
          team2_id: localMatch.team2Id,
          total_overs: localMatch.totalOvers,
          status: 'completed',
          winner_team_id: localMatch.winnerId,
          result_description: localMatch.resultDescription,
          created_at: new Date(localMatch.createdAt).toISOString(),
          completed_at: localMatch.completedAt ? new Date(localMatch.completedAt).toISOString() : null,
        });
      if (error) throw error;
    }

    // 2. Sync each innings
    for (const localInnings of inningsList) {
      const inningsEvents = events.filter(e => e.inningsNumber === localInnings.inningsNumber);
      const batsmenState = await getBatsmenState(matchId, localInnings.inningsNumber);
      const bowlersState = await getBowlersState(matchId, localInnings.inningsNumber);

      const inningsState = deriveInningsState(
        inningsEvents,
        localInnings.inningsNumber,
        localInnings.battingTeamId,
        localInnings.bowlingTeamId,
        playerNames,
        batsmenState,
        bowlersState
      );

      // Create innings record
      // Check if innings exists first
      const { data: existingInnings } = await supabase
        .from('innings')
        .select()
        .eq('match_id', matchId)
        .eq('innings_number', localInnings.inningsNumber)
        .maybeSingle();

      let inningsData;
      if (existingInnings) {
        const { data, error } = await supabase
          .from('innings')
          .update({
            total_runs: inningsState.totalRuns,
            total_wickets: inningsState.totalWickets,
            total_overs_completed: inningsState.totalOversCompleted,
            total_extras: inningsState.totalExtras,
            is_completed: localInnings.isCompleted,
          })
          .eq('id', existingInnings.id)
          .select()
          .single();
        if (error) throw error;
        inningsData = data;
      } else {
        const { data, error } = await supabase
          .from('innings')
          .insert({
            match_id: matchId,
            innings_number: localInnings.inningsNumber,
            batting_team_id: localInnings.battingTeamId,
            bowling_team_id: localInnings.bowlingTeamId,
            total_runs: inningsState.totalRuns,
            total_wickets: inningsState.totalWickets,
            total_overs_completed: inningsState.totalOversCompleted,
            total_extras: inningsState.totalExtras,
            is_completed: localInnings.isCompleted,
          })
          .select()
          .single();
        if (error) throw error;
        inningsData = data;
      }

      if (!inningsData) {
        throw new Error('Failed to sync innings');
      }

      // Delete existing stats before inserting new ones
      await supabase.from('match_batting_stats')
        .delete()
        .eq('match_id', matchId)
        .eq('innings_number', localInnings.inningsNumber);
      
      await supabase.from('match_bowling_stats')
        .delete()
        .eq('match_id', matchId)
        .eq('innings_number', localInnings.inningsNumber);

      await supabase.from('batsman_innings_stats')
        .delete()
        .eq('innings_id', inningsData.id);
      
      await supabase.from('bowler_innings_stats')
        .delete()
        .eq('innings_id', inningsData.id);

      // Delete old overs and deliveries
      const { data: oldOvers } = await supabase
        .from('overs')
        .select('id')
        .eq('innings_id', inningsData.id);
      
      if (oldOvers && oldOvers.length > 0) {
        for (const over of oldOvers) {
          await supabase.from('deliveries').delete().eq('over_id', over.id);
        }
        await supabase.from('overs').delete().eq('innings_id', inningsData.id);
      }

      // Sync batting stats
      const battingStats = Array.from(inningsState.batsmanStats.values());
      for (const stat of battingStats) {
        await supabase.from('match_batting_stats').insert({
          match_id: matchId,
          innings_number: localInnings.inningsNumber,
          team_id: localInnings.battingTeamId,
          player_id: stat.playerId,
          runs: stat.runsScored,
          balls: stat.ballsFaced,
          fours: stat.fours,
          sixes: stat.sixes,
          is_out: stat.isOut,
          dismissal_type: stat.isOut ? 'out' : null,
          batting_order: stat.battingOrder,
        });
      }

      // Sync bowling stats
      const bowlingStats = Array.from(inningsState.bowlerStats.values());
      for (const stat of bowlingStats) {
        await supabase.from('match_bowling_stats').insert({
          match_id: matchId,
          innings_number: localInnings.inningsNumber,
          team_id: localInnings.bowlingTeamId,
          player_id: stat.playerId,
          overs: stat.oversBowled,
          balls: stat.ballsBowled,
          runs_conceded: stat.runsConceded,
          wickets: stat.wicketsTaken,
          wides: stat.wides,
          no_balls: stat.noBalls,
        });
      }

      // Sync individual deliveries to overs and deliveries tables
      // Group events by over
      const eventsByOver = new Map<number, DeliveryEvent[]>();
      inningsEvents.forEach(e => {
        const overEvents = eventsByOver.get(e.overNumber) || [];
        overEvents.push(e);
        eventsByOver.set(e.overNumber, overEvents);
      });

      for (const [overNumber, overEvents] of eventsByOver) {
        const bowlerId = overEvents[0]?.bowlerId;
        if (!bowlerId || !inningsData) continue;

        const legalBalls = overEvents.filter(e => e.isLegalDelivery).length;
        const overRuns = overEvents.reduce((sum, e) => sum + e.runsScored, 0);
        const overWickets = overEvents.filter(e => e.eventType === 'WICKET').length;

        // Create over with new UUID
        const { data: overData, error: overError } = await supabase
          .from('overs')
          .insert({
            id: generateId(),
            innings_id: inningsData.id,
            over_number: overNumber,
            bowler_id: bowlerId,
            runs_conceded: overRuns,
            wickets_taken: overWickets,
            is_completed: legalBalls >= 6,
          })
          .select()
          .single();

        if (overError) throw overError;

        // Create deliveries
        for (let i = 0; i < overEvents.length; i++) {
          const event = overEvents[i];
          await supabase.from('deliveries').insert({
            id: generateId(),
            over_id: overData.id,
            innings_id: inningsData.id,
            ball_number: i + 1,
            is_legal_delivery: event.isLegalDelivery,
            runs_scored: event.runsScored,
            is_wide: event.eventType === 'WIDE',
            is_no_ball: event.eventType.startsWith('NO_BALL'),
            is_wicket: event.eventType === 'WICKET',
            batsman_id: event.batsmanId,
            bowler_id: event.bowlerId,
          });
        }
      }

      // Also sync to batsman_innings_stats and bowler_innings_stats
      for (const stat of battingStats) {
        await supabase.from('batsman_innings_stats').insert({
          innings_id: inningsData.id,
          batsman_id: stat.playerId,
          runs_scored: stat.runsScored,
          balls_faced: stat.ballsFaced,
          fours: stat.fours,
          sixes: stat.sixes,
          is_out: stat.isOut,
          batting_order: stat.battingOrder,
        });
      }

      for (const stat of bowlingStats) {
        await supabase.from('bowler_innings_stats').insert({
          innings_id: inningsData.id,
          bowler_id: stat.playerId,
          overs_bowled: stat.oversBowled,
          runs_conceded: stat.runsConceded,
          wickets_taken: stat.wicketsTaken,
          wides: stat.wides,
          no_balls: stat.noBalls,
        });
      }
    }

    // Mark local match as synced
    const updatedMatch: LocalMatch = {
      ...localMatch,
      status: 'COMPLETED',
      syncedAt: Date.now(),
    };
    await saveMatch(updatedMatch);

    return { success: true, matchId };
  } catch (error) {
    console.error('Sync error:', error);
    return { 
      success: false, 
      matchId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Sync all pending matches
export async function syncAllPendingMatches(): Promise<SyncResult[]> {
  const pendingMatches = await getMatchesByStatus('PENDING_SYNC');
  const results: SyncResult[] = [];
  
  for (const match of pendingMatches) {
    const result = await syncMatchToSupabase(match.id);
    results.push(result);
  }
  
  return results;
}

// Check sync status
export async function getSyncStatus(): Promise<{
  pendingCount: number;
  completedCount: number;
  liveCount: number;
}> {
  const [pending, completed, live] = await Promise.all([
    getMatchesByStatus('PENDING_SYNC'),
    getMatchesByStatus('COMPLETED'),
    getMatchesByStatus('LIVE'),
  ]);
  
  return {
    pendingCount: pending.length,
    completedCount: completed.length,
    liveCount: live.length,
  };
}

// Load match data from Supabase to local (for viewing completed matches)
export async function loadMatchFromSupabase(matchId: string): Promise<boolean> {
  try {
    const { data: match } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();
    
    if (!match) return false;
    
    // Get team names
    const [team1Res, team2Res] = await Promise.all([
      supabase.from('teams').select('name, short_name').eq('id', match.team1_id).single(),
      supabase.from('teams').select('name, short_name').eq('id', match.team2_id).single(),
    ]);
    
    const localMatch: LocalMatch = {
      id: match.id,
      team1Id: match.team1_id,
      team2Id: match.team2_id,
      team1Name: team1Res.data?.name || 'Team 1',
      team2Name: team2Res.data?.name || 'Team 2',
      team1ShortName: team1Res.data?.short_name || team1Res.data?.name || 'T1',
      team2ShortName: team2Res.data?.short_name || team2Res.data?.name || 'T2',
      totalOvers: match.total_overs,
      status: 'COMPLETED',
      winnerId: match.winner_team_id,
      resultDescription: match.result_description,
      createdAt: new Date(match.created_at).getTime(),
      completedAt: match.completed_at ? new Date(match.completed_at).getTime() : null,
      syncedAt: Date.now(),
    };
    
    await saveMatch(localMatch);
    return true;
  } catch (error) {
    console.error('Error loading match from Supabase:', error);
    return false;
  }
}
