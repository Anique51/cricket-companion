import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  Match, Innings, Over, Delivery, Player, 
  BatsmanInningsStats, BowlerInningsStats, ScoringAction 
} from '@/types/cricket';
import { toast } from 'sonner';

interface UseCricketMatchReturn {
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
  isLoading: boolean;
  dismissedBatsmanIds: string[];
  
  // Actions
  recordDelivery: (action: ScoringAction) => Promise<void>;
  selectNewBatsman: (playerId: string) => Promise<void>;
  selectNewBowler: (playerId: string) => Promise<void>;
  startSecondInnings: (battingTeamId: string, batsmanId: string, bowlerId: string) => Promise<void>;
  loadMatch: (matchId: string) => Promise<void>;
  endInningsManually: () => Promise<void>;
  endMatchManually: () => Promise<void>;
  openBowlerModal: () => void;
  
  // Modals
  showBatsmanModal: boolean;
  showBowlerModal: boolean;
  showInningsSummary: boolean;
  showMatchResult: boolean;
  setShowBatsmanModal: (show: boolean) => void;
  setShowBowlerModal: (show: boolean) => void;
  setShowInningsSummary: (show: boolean) => void;
  setShowMatchResult: (show: boolean) => void;
  
  // For wicket on last ball
  pendingBowlerChange: boolean;
}

// Helper to get team name
const getTeamName = async (teamId: string): Promise<string> => {
  const { data } = await supabase
    .from('teams')
    .select('short_name, name')
    .eq('id', teamId)
    .single();
  return data?.short_name || data?.name || 'Team';
};

// Helper to persist match-scoped stats
const persistMatchStats = async (matchId: string, inningsNumber: number, inningsId: string) => {
  try {
    // Get all batsman stats for this innings
    const { data: batsmanStats } = await supabase
      .from('batsman_innings_stats')
      .select('*')
      .eq('innings_id', inningsId);

    // Get all bowler stats for this innings
    const { data: bowlerStats } = await supabase
      .from('bowler_innings_stats')
      .select('*')
      .eq('innings_id', inningsId);

    // Get innings info for team IDs
    const { data: innings } = await supabase
      .from('innings')
      .select('batting_team_id, bowling_team_id')
      .eq('id', inningsId)
      .single();

    if (!innings) return;

    // Delete existing match stats for this innings (in case of re-save)
    await supabase
      .from('match_batting_stats')
      .delete()
      .eq('match_id', matchId)
      .eq('innings_number', inningsNumber);

    await supabase
      .from('match_bowling_stats')
      .delete()
      .eq('match_id', matchId)
      .eq('innings_number', inningsNumber);

    // Insert batting stats
    if (batsmanStats && batsmanStats.length > 0) {
      const battingInserts = batsmanStats.map(stat => ({
        match_id: matchId,
        innings_number: inningsNumber,
        team_id: innings.batting_team_id,
        player_id: stat.batsman_id,
        runs: stat.runs_scored,
        balls: stat.balls_faced,
        fours: stat.fours,
        sixes: stat.sixes,
        is_out: stat.is_out,
        dismissal_type: stat.is_out ? 'out' : null,
        batting_order: stat.batting_order
      }));

      await supabase.from('match_batting_stats').insert(battingInserts);
    }

    // Insert bowling stats
    if (bowlerStats && bowlerStats.length > 0) {
      const bowlingInserts = bowlerStats.map(stat => ({
        match_id: matchId,
        innings_number: inningsNumber,
        team_id: innings.bowling_team_id,
        player_id: stat.bowler_id,
        overs: stat.overs_bowled,
        balls: 0, // Will be calculated from overs
        runs_conceded: stat.runs_conceded,
        wickets: stat.wickets_taken,
        wides: stat.wides,
        no_balls: stat.no_balls
      }));

      await supabase.from('match_bowling_stats').insert(bowlingInserts);
    }
  } catch (error) {
    console.error('Error persisting match stats:', error);
  }
};

export function useCricketMatch(): UseCricketMatchReturn {
  const [match, setMatch] = useState<Match | null>(null);
  const [currentInnings, setCurrentInnings] = useState<Innings | null>(null);
  const [currentOver, setCurrentOver] = useState<Over | null>(null);
  const [currentBatsman, setCurrentBatsman] = useState<Player | null>(null);
  const [currentBowler, setCurrentBowler] = useState<Player | null>(null);
  const [batsmanStats, setBatsmanStats] = useState<BatsmanInningsStats | null>(null);
  const [bowlerStats, setBowlerStats] = useState<BowlerInningsStats | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [legalBallCount, setLegalBallCount] = useState(0);
  const [isProcessingDelivery, setIsProcessingDelivery] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedBatsmanIds, setDismissedBatsmanIds] = useState<string[]>([]);
  
  // Modals
  const [showBatsmanModal, setShowBatsmanModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [showInningsSummary, setShowInningsSummary] = useState(false);
  const [showMatchResult, setShowMatchResult] = useState(false);
  const [pendingBowlerChange, setPendingBowlerChange] = useState(false);
  const [bowlerModalTriggered, setBowlerModalTriggered] = useState(false);

  // Allow manual opening of bowler modal for recovery
  const openBowlerModal = useCallback(() => {
    setShowBowlerModal(true);
  }, []);

  // Load dismissed batsmen for current innings
  const loadDismissedBatsmen = useCallback(async (inningsId: string) => {
    const { data } = await supabase
      .from('batsman_innings_stats')
      .select('batsman_id')
      .eq('innings_id', inningsId)
      .eq('is_out', true);
    
    if (data) {
      setDismissedBatsmanIds(data.map(d => d.batsman_id));
    }
  }, []);

  // Load current over deliveries
  const loadDeliveries = useCallback(async (overId: string) => {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('over_id', overId)
      .order('ball_number', { ascending: true });
    
    if (error) {
      console.error('Error loading deliveries:', error);
      return;
    }
    
    setDeliveries(data || []);
    const legal = (data || []).filter(d => d.is_legal_delivery).length;
    setLegalBallCount(legal);
  }, []);

  // Load match state
  const loadMatch = useCallback(async (matchId: string) => {
    setIsLoading(true);
    try {
      // Load match
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();
      
      if (matchError) throw matchError;
      setMatch(matchData);

      // Load current innings
      const { data: inningsData } = await supabase
        .from('innings')
        .select('*')
        .eq('match_id', matchId)
        .eq('is_completed', false)
        .order('innings_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (inningsData) {
        setCurrentInnings(inningsData);
        await loadDismissedBatsmen(inningsData.id);

        // Load current over
        const { data: overData } = await supabase
          .from('overs')
          .select('*')
          .eq('innings_id', inningsData.id)
          .eq('is_completed', false)
          .order('over_number', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (overData) {
          setCurrentOver(overData);
          await loadDeliveries(overData.id);

          // Load bowler
          const { data: bowlerData } = await supabase
            .from('players')
            .select('*')
            .eq('id', overData.bowler_id)
            .single();
          
          if (bowlerData) setCurrentBowler(bowlerData);

          // Load bowler stats
          const { data: bowlerStatsData } = await supabase
            .from('bowler_innings_stats')
            .select('*')
            .eq('innings_id', inningsData.id)
            .eq('bowler_id', overData.bowler_id)
            .maybeSingle();
          
          if (bowlerStatsData) setBowlerStats(bowlerStatsData);
        }

        // Load current batsman (not out)
        const { data: batsmanStatsData } = await supabase
          .from('batsman_innings_stats')
          .select('*')
          .eq('innings_id', inningsData.id)
          .eq('is_out', false)
          .order('batting_order', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (batsmanStatsData) {
          setBatsmanStats(batsmanStatsData);

          const { data: batsmanData } = await supabase
            .from('players')
            .select('*')
            .eq('id', batsmanStatsData.batsman_id)
            .single();
          
          if (batsmanData) setCurrentBatsman(batsmanData);
        }
      }
    } catch (error) {
      console.error('Error loading match:', error);
      toast.error('Failed to load match');
    } finally {
      setIsLoading(false);
    }
  }, [loadDeliveries, loadDismissedBatsmen]);

  // Check how many batsmen are still available and get the list
  const getAvailableBatsmen = useCallback(async (inningsId: string, battingTeamId: string, justDismissedId?: string) => {
    // Get total players in batting team
    const { data: allPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', battingTeamId);
    
    // Get all dismissed batsmen from the database
    const { data: dismissed } = await supabase
      .from('batsman_innings_stats')
      .select('batsman_id')
      .eq('innings_id', inningsId)
      .eq('is_out', true);

    // Get batsmen who are currently batting (not out)
    const { data: currentlyBatting } = await supabase
      .from('batsman_innings_stats')
      .select('batsman_id')
      .eq('innings_id', inningsId)
      .eq('is_out', false);

    const dismissedIds = new Set(dismissed?.map(b => b.batsman_id) || []);
    const currentlyBattingIds = new Set(currentlyBatting?.map(b => b.batsman_id) || []);
    
    // Add the just-dismissed batsman to dismissed set (in case DB hasn't updated yet)
    if (justDismissedId) {
      dismissedIds.add(justDismissedId);
    }

    // Available batsmen = players who are NOT dismissed AND NOT currently batting
    const availablePlayers = (allPlayers || []).filter(p => 
      !dismissedIds.has(p.id) && !currentlyBattingIds.has(p.id)
    );

    return availablePlayers;
  }, []);

  // Check if innings should end (all wickets or overs complete)
  const checkInningsEnd = useCallback(async (innings: Innings, totalOvers: number) => {
    const maxWickets = 10; // Standard cricket
    const oversCompleted = Math.floor(innings.total_overs_completed);
    
    if (innings.total_wickets >= maxWickets || oversCompleted >= totalOvers) {
      // Persist match-scoped stats before ending innings
      if (match) {
        await persistMatchStats(match.id, innings.innings_number, innings.id);
      }
      
      // End innings
      await supabase
        .from('innings')
        .update({ is_completed: true })
        .eq('id', innings.id);
      
      if (innings.innings_number === 1) {
        setShowInningsSummary(true);
      } else {
        // Second innings complete - determine result
        const { data: firstInnings } = await supabase
          .from('innings')
          .select('total_runs')
          .eq('match_id', innings.match_id)
          .eq('innings_number', 1)
          .single();
        
        if (firstInnings) {
          const target = firstInnings.total_runs + 1;
          let winnerId: string | null = null;
          let resultDesc = '';
          
          if (innings.total_runs >= target) {
            winnerId = innings.batting_team_id;
            const wicketsRemaining = maxWickets - innings.total_wickets;
            const teamName = await getTeamName(winnerId);
            resultDesc = `${teamName} Won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`;
          } else {
            winnerId = innings.bowling_team_id;
            const runsDiff = target - innings.total_runs - 1;
            const teamName = await getTeamName(winnerId);
            resultDesc = `${teamName} Won by ${runsDiff} run${runsDiff !== 1 ? 's' : ''}`;
          }
          
          await supabase
            .from('matches')
            .update({ 
              status: 'completed', 
              winner_team_id: winnerId,
              result_description: resultDesc,
              completed_at: new Date().toISOString()
            })
            .eq('id', innings.match_id);
          
          setMatch(prev => prev ? { 
            ...prev, 
            status: 'completed', 
            winner_team_id: winnerId,
            result_description: resultDesc 
          } : null);
          
          setShowMatchResult(true);
        }
      }
      return true;
    }
    return false;
  }, [match]);

  // Check if chasing team won (during second innings)
  const checkChasingWin = useCallback(async (innings: Innings) => {
    if (innings.innings_number !== 2) return false;
    
    const { data: firstInnings } = await supabase
      .from('innings')
      .select('total_runs')
      .eq('match_id', innings.match_id)
      .eq('innings_number', 1)
      .single();
    
    if (firstInnings) {
      const target = firstInnings.total_runs + 1;
      if (innings.total_runs >= target) {
        // Persist match-scoped stats
        if (match) {
          await persistMatchStats(match.id, innings.innings_number, innings.id);
        }
        
        // Chasing team wins!
        const wicketsRemaining = 10 - innings.total_wickets;
        const teamName = await getTeamName(innings.batting_team_id);
        const resultDesc = `${teamName} Won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`;
        
        await supabase
          .from('innings')
          .update({ is_completed: true })
          .eq('id', innings.id);
        
        await supabase
          .from('matches')
          .update({ 
            status: 'completed', 
            winner_team_id: innings.batting_team_id,
            result_description: resultDesc,
            completed_at: new Date().toISOString()
          })
          .eq('id', innings.match_id);
        
        setMatch(prev => prev ? { 
          ...prev, 
          status: 'completed', 
          winner_team_id: innings.batting_team_id,
          result_description: resultDesc 
        } : null);
        
        setShowMatchResult(true);
        return true;
      }
    }
    return false;
  }, [match]);

  // End innings manually
  const endInningsManually = useCallback(async () => {
    if (!currentInnings || !match) return;
    
    // Persist match-scoped stats
    await persistMatchStats(match.id, currentInnings.innings_number, currentInnings.id);
    
    await supabase
      .from('innings')
      .update({ is_completed: true })
      .eq('id', currentInnings.id);
    
    if (currentInnings.innings_number === 1) {
      setShowInningsSummary(true);
    } else {
      // Second innings - determine result
      const { data: firstInnings } = await supabase
        .from('innings')
        .select('total_runs')
        .eq('match_id', match.id)
        .eq('innings_number', 1)
        .single();
      
      if (firstInnings) {
        const target = firstInnings.total_runs + 1;
        let winnerId: string | null = null;
        let resultDesc = '';
        
        if (currentInnings.total_runs >= target) {
          winnerId = currentInnings.batting_team_id;
          const wicketsRemaining = 10 - currentInnings.total_wickets;
          const teamName = await getTeamName(winnerId);
          resultDesc = `${teamName} Won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`;
        } else {
          winnerId = currentInnings.bowling_team_id;
          const runsDiff = target - currentInnings.total_runs - 1;
          const teamName = await getTeamName(winnerId);
          resultDesc = `${teamName} Won by ${runsDiff} run${runsDiff !== 1 ? 's' : ''}`;
        }
        
        await supabase
          .from('matches')
          .update({ 
            status: 'completed', 
            winner_team_id: winnerId,
            result_description: resultDesc,
            completed_at: new Date().toISOString()
          })
          .eq('id', match.id);
        
        setMatch(prev => prev ? { 
          ...prev, 
          status: 'completed', 
          winner_team_id: winnerId,
          result_description: resultDesc 
        } : null);
        
        setShowMatchResult(true);
      }
    }
  }, [currentInnings, match]);

  // End match manually
  const endMatchManually = useCallback(async () => {
    if (!match || !currentInnings) return;
    
    // Persist match-scoped stats for current innings
    await persistMatchStats(match.id, currentInnings.innings_number, currentInnings.id);
    
    // Mark innings as complete
    await supabase
      .from('innings')
      .update({ is_completed: true })
      .eq('id', currentInnings.id);
    
    // Mark match as completed without a winner (or determine based on current scores)
    const { data: allInnings } = await supabase
      .from('innings')
      .select('*')
      .eq('match_id', match.id)
      .order('innings_number');
    
    let resultDesc = 'Match ended';
    let winnerId: string | null = null;
    
    if (allInnings && allInnings.length === 2) {
      const inn1 = allInnings[0];
      const inn2 = allInnings[1];
      
      if (inn2.total_runs > inn1.total_runs) {
        winnerId = inn2.batting_team_id;
        const wicketsRemaining = 10 - inn2.total_wickets;
        const teamName = await getTeamName(winnerId);
        resultDesc = `${teamName} Won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`;
      } else if (inn1.total_runs > inn2.total_runs) {
        winnerId = inn1.batting_team_id;
        const runsDiff = inn1.total_runs - inn2.total_runs;
        const teamName = await getTeamName(winnerId);
        resultDesc = `${teamName} Won by ${runsDiff} run${runsDiff !== 1 ? 's' : ''}`;
      } else {
        resultDesc = 'Match tied';
      }
    }
    
    await supabase
      .from('matches')
      .update({ 
        status: 'completed', 
        winner_team_id: winnerId,
        result_description: resultDesc,
        completed_at: new Date().toISOString()
      })
      .eq('id', match.id);
    
    setMatch(prev => prev ? { 
      ...prev, 
      status: 'completed', 
      winner_team_id: winnerId,
      result_description: resultDesc 
    } : null);
    
    setShowMatchResult(true);
  }, [match, currentInnings]);

  // Record a delivery - ATOMIC OPERATION
  const recordDelivery = useCallback(async (action: ScoringAction) => {
    if (isProcessingDelivery || !currentOver || !currentInnings || !currentBatsman || !currentBowler || !match) {
      return;
    }

    setIsProcessingDelivery(true);
    
    try {
      const isLegal = action !== 'wide' && action !== 'noball';
      const newLegalCount = isLegal ? legalBallCount + 1 : legalBallCount;
      
      let runs = 0;
      let isWide = false;
      let isNoBall = false;
      let isWicket = false;
      let isFour = false;
      let isSix = false;

      switch (action) {
        case 'dot':
          runs = 0;
          break;
        case 'four':
          runs = 4;
          isFour = true;
          break;
        case 'six':
          runs = 6;
          isSix = true;
          break;
        case 'wide':
          runs = 1;
          isWide = true;
          break;
        case 'noball':
          runs = 1;
          isNoBall = true;
          break;
        case 'wicket':
          runs = 0;
          isWicket = true;
          break;
      }

      // 1. Insert delivery
      const ballNumber = deliveries.length + 1;
      const { data: newDelivery, error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
          over_id: currentOver.id,
          innings_id: currentInnings.id,
          ball_number: ballNumber,
          is_legal_delivery: isLegal,
          runs_scored: runs,
          is_wide: isWide,
          is_no_ball: isNoBall,
          is_wicket: isWicket,
          batsman_id: currentBatsman.id,
          bowler_id: currentBowler.id
        })
        .select()
        .single();

      if (deliveryError) throw deliveryError;

      // 2. Update innings stats
      const newTotalRuns = currentInnings.total_runs + runs;
      const newTotalWickets = currentInnings.total_wickets + (isWicket ? 1 : 0);
      const newExtras = currentInnings.total_extras + (isWide || isNoBall ? 1 : 0);
      
      await supabase
        .from('innings')
        .update({
          total_runs: newTotalRuns,
          total_wickets: newTotalWickets,
          total_extras: newExtras
        })
        .eq('id', currentInnings.id);

      // 3. Update batsman stats
      const newBatsmanRuns = (batsmanStats?.runs_scored || 0) + (isWide ? 0 : runs);
      const newBallsFaced = (batsmanStats?.balls_faced || 0) + (isLegal && !isWide ? 1 : 0);
      const newFours = (batsmanStats?.fours || 0) + (isFour ? 1 : 0);
      const newSixes = (batsmanStats?.sixes || 0) + (isSix ? 1 : 0);
      
      await supabase
        .from('batsman_innings_stats')
        .update({
          runs_scored: newBatsmanRuns,
          balls_faced: newBallsFaced,
          fours: newFours,
          sixes: newSixes,
          is_out: isWicket
        })
        .eq('id', batsmanStats?.id);

      // 4. Update bowler stats
      const newBowlerRuns = (bowlerStats?.runs_conceded || 0) + runs;
      const newWickets = (bowlerStats?.wickets_taken || 0) + (isWicket ? 1 : 0);
      const newWides = (bowlerStats?.wides || 0) + (isWide ? 1 : 0);
      const newNoBalls = (bowlerStats?.no_balls || 0) + (isNoBall ? 1 : 0);
      
      await supabase
        .from('bowler_innings_stats')
        .update({
          runs_conceded: newBowlerRuns,
          wickets_taken: newWickets,
          wides: newWides,
          no_balls: newNoBalls
        })
        .eq('id', bowlerStats?.id);

      // 5. Update over stats
      await supabase
        .from('overs')
        .update({
          runs_conceded: currentOver.runs_conceded + runs,
          wickets_taken: currentOver.wickets_taken + (isWicket ? 1 : 0)
        })
        .eq('id', currentOver.id);

      // Update local state
      setDeliveries(prev => [...prev, newDelivery]);
      setLegalBallCount(newLegalCount);
      
      setCurrentInnings(prev => prev ? {
        ...prev,
        total_runs: newTotalRuns,
        total_wickets: newTotalWickets,
        total_extras: newExtras
      } : null);

      setBatsmanStats(prev => prev ? {
        ...prev,
        runs_scored: newBatsmanRuns,
        balls_faced: newBallsFaced,
        fours: newFours,
        sixes: newSixes,
        is_out: isWicket
      } : null);

      setBowlerStats(prev => prev ? {
        ...prev,
        runs_conceded: newBowlerRuns,
        wickets_taken: newWickets,
        wides: newWides,
        no_balls: newNoBalls
      } : null);

      // Update dismissed batsmen if wicket
      if (isWicket && currentBatsman) {
        setDismissedBatsmanIds(prev => [...prev, currentBatsman.id]);
      }

      // Check for chasing win first
      const updatedInnings = {
        ...currentInnings,
        total_runs: newTotalRuns,
        total_wickets: newTotalWickets
      };
      
      const chasingWon = await checkChasingWin(updatedInnings);
      if (chasingWon) {
        setIsProcessingDelivery(false);
        return;
      }

      // Handle wicket
      if (isWicket) {
        // Get available batsmen (pass current batsman id as just dismissed)
        const availablePlayers = await getAvailableBatsmen(
          currentInnings.id, 
          currentInnings.batting_team_id,
          currentBatsman.id
        );

        if (availablePlayers.length === 0 || newTotalWickets >= 10) {
          // No more batsmen - end innings automatically (don't show batsman modal)
          await checkInningsEnd({
            ...currentInnings,
            total_runs: newTotalRuns,
            total_wickets: newTotalWickets,
            total_overs_completed: currentInnings.total_overs_completed
          }, match.total_overs);
          
          setIsProcessingDelivery(false);
        } else if (availablePlayers.length === 1) {
          // Exactly one batsman left - auto-select them
          const lastBatsman = availablePlayers[0];
          
          // Set pending bowler change if this was the last ball
          if (newLegalCount >= 6) {
            setPendingBowlerChange(true);
          }
          
          // Auto-select the last remaining batsman
          await autoSelectBatsman(lastBatsman.id, newLegalCount >= 6);
        } else {
          // Multiple batsmen available - show selection modal
          if (newLegalCount >= 6) {
            setPendingBowlerChange(true);
          }
          setShowBatsmanModal(true);
        }
      } else if (newLegalCount >= 6 && !bowlerModalTriggered) {
        // Over complete - check if it's the last over
        const newOversCompleted = Math.floor(currentInnings.total_overs_completed) + 1;
        
        if (newOversCompleted >= match.total_overs) {
          // Last over complete - end innings
          await completeOver(newTotalRuns);
          await checkInningsEnd({
            ...currentInnings,
            total_runs: newTotalRuns,
            total_wickets: newTotalWickets,
            total_overs_completed: newOversCompleted
          }, match.total_overs);
          setIsProcessingDelivery(false);
        } else {
          // More overs to bowl - need new bowler
          await completeOver(newTotalRuns);
          setBowlerModalTriggered(true);
          setShowBowlerModal(true);
        }
      } else {
        setIsProcessingDelivery(false);
      }

    } catch (error) {
      console.error('Error recording delivery:', error);
      toast.error('Failed to record delivery');
      setIsProcessingDelivery(false);
    }
  }, [
    isProcessingDelivery, currentOver, currentInnings, currentBatsman, 
    currentBowler, match, batsmanStats, bowlerStats, deliveries, 
    legalBallCount, checkChasingWin, checkInningsEnd, getAvailableBatsmen
  ]);

  // Complete current over
  const completeOver = useCallback(async (totalRuns?: number) => {
    if (!currentOver || !currentInnings || !bowlerStats) return;

    const completedOvers = Math.floor(currentInnings.total_overs_completed) + 1;
    
    await supabase
      .from('overs')
      .update({ is_completed: true })
      .eq('id', currentOver.id);

    // Update bowler overs
    await supabase
      .from('bowler_innings_stats')
      .update({ overs_bowled: (bowlerStats.overs_bowled || 0) + 1 })
      .eq('id', bowlerStats.id);

    // Update innings overs completed
    await supabase
      .from('innings')
      .update({ total_overs_completed: completedOvers })
      .eq('id', currentInnings.id);

    setCurrentInnings(prev => prev ? {
      ...prev,
      total_overs_completed: completedOvers
    } : null);

    // Reset for new over
    setDeliveries([]);
    setLegalBallCount(0);
  }, [currentOver, currentInnings, bowlerStats]);

  // Auto-select batsman (when only one remains after wicket)
  const autoSelectBatsman = useCallback(async (playerId: string, isLastBallOfOver: boolean) => {
    if (!currentInnings) return;
    
    try {
      // Get batting order
      const { data: existingStats } = await supabase
        .from('batsman_innings_stats')
        .select('batting_order')
        .eq('innings_id', currentInnings.id)
        .order('batting_order', { ascending: false })
        .limit(1);
      
      const newOrder = (existingStats?.[0]?.batting_order || 0) + 1;

      // Create new batsman stats
      const { data: newStats, error } = await supabase
        .from('batsman_innings_stats')
        .insert({
          innings_id: currentInnings.id,
          batsman_id: playerId,
          runs_scored: 0,
          balls_faced: 0,
          fours: 0,
          sixes: 0,
          is_out: false,
          batting_order: newOrder
        })
        .select()
        .single();

      if (error) throw error;

      // Load new batsman
      const { data: batsmanData } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      setCurrentBatsman(batsmanData);
      setBatsmanStats(newStats);
      
      toast.success(`${batsmanData?.name || 'Last batsman'} is now batting`);

      // If wicket was on last ball, complete over and show bowler modal
      if (isLastBallOfOver) {
        await completeOver();
        setPendingBowlerChange(false);
        
        // Check if this was the last over
        const newOversCompleted = Math.floor(currentInnings.total_overs_completed) + 1;
        if (match && newOversCompleted >= match.total_overs) {
          // Last over - end innings, don't ask for bowler
          await checkInningsEnd({
            ...currentInnings,
            total_overs_completed: newOversCompleted
          }, match.total_overs);
          setIsProcessingDelivery(false);
        } else {
          setShowBowlerModal(true);
        }
      } else {
        setIsProcessingDelivery(false);
      }

    } catch (error) {
      console.error('Error auto-selecting batsman:', error);
      toast.error('Failed to select batsman');
      setIsProcessingDelivery(false);
    }
  }, [currentInnings, completeOver, match, checkInningsEnd]);

  // Select new batsman after wicket
  const selectNewBatsman = useCallback(async (playerId: string) => {
    if (!currentInnings) return;
    
    try {
      // Get batting order
      const { data: existingStats } = await supabase
        .from('batsman_innings_stats')
        .select('batting_order')
        .eq('innings_id', currentInnings.id)
        .order('batting_order', { ascending: false })
        .limit(1);
      
      const newOrder = (existingStats?.[0]?.batting_order || 0) + 1;

      // Create new batsman stats
      const { data: newStats, error } = await supabase
        .from('batsman_innings_stats')
        .insert({
          innings_id: currentInnings.id,
          batsman_id: playerId,
          runs_scored: 0,
          balls_faced: 0,
          fours: 0,
          sixes: 0,
          is_out: false,
          batting_order: newOrder
        })
        .select()
        .single();

      if (error) throw error;

      // Load new batsman
      const { data: batsmanData } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      setCurrentBatsman(batsmanData);
      setBatsmanStats(newStats);
      setShowBatsmanModal(false);

      // If wicket was on last ball, now show bowler modal
      if (pendingBowlerChange) {
        await completeOver();
        setPendingBowlerChange(false);
        
        // Check if this was the last over
        const newOversCompleted = Math.floor(currentInnings.total_overs_completed) + 1;
        if (match && newOversCompleted >= match.total_overs) {
          // Last over - end innings, don't ask for bowler
          await checkInningsEnd({
            ...currentInnings,
            total_overs_completed: newOversCompleted
          }, match.total_overs);
          setIsProcessingDelivery(false);
        } else {
          setShowBowlerModal(true);
        }
      } else {
        setIsProcessingDelivery(false);
      }

    } catch (error) {
      console.error('Error selecting batsman:', error);
      toast.error('Failed to select batsman');
    }
  }, [currentInnings, pendingBowlerChange, completeOver, match, checkInningsEnd]);

  // Select new bowler for new over
  const selectNewBowler = useCallback(async (playerId: string) => {
    if (!currentInnings || !match) return;
    
    try {
      // Create new over
      const newOverNumber = Math.floor(currentInnings.total_overs_completed) + 1;
      
      // Check if innings should end
      if (newOverNumber > match.total_overs) {
        await checkInningsEnd(currentInnings, match.total_overs);
        setShowBowlerModal(false);
        setBowlerModalTriggered(false);
        setIsProcessingDelivery(false);
        return;
      }

      const { data: newOver, error: overError } = await supabase
        .from('overs')
        .insert({
          innings_id: currentInnings.id,
          over_number: newOverNumber,
          bowler_id: playerId,
          runs_conceded: 0,
          wickets_taken: 0,
          is_completed: false
        })
        .select()
        .single();

      if (overError) throw overError;

      // Get or create bowler stats
      let newBowlerStats;
      const { data: existingStats } = await supabase
        .from('bowler_innings_stats')
        .select('*')
        .eq('innings_id', currentInnings.id)
        .eq('bowler_id', playerId)
        .maybeSingle();

      if (existingStats) {
        newBowlerStats = existingStats;
      } else {
        const { data: createdStats } = await supabase
          .from('bowler_innings_stats')
          .insert({
            innings_id: currentInnings.id,
            bowler_id: playerId,
            overs_bowled: 0,
            runs_conceded: 0,
            wickets_taken: 0,
            wides: 0,
            no_balls: 0
          })
          .select()
          .single();
        
        newBowlerStats = createdStats;
      }

      // Load bowler
      const { data: bowlerData } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      setCurrentOver(newOver);
      setCurrentBowler(bowlerData);
      setBowlerStats(newBowlerStats);
      setDeliveries([]);
      setLegalBallCount(0);
      setShowBowlerModal(false);
      setBowlerModalTriggered(false);
      setIsProcessingDelivery(false);

    } catch (error) {
      console.error('Error selecting bowler:', error);
      toast.error('Failed to select bowler');
    }
  }, [currentInnings, match, checkInningsEnd]);

  // Start second innings
  const startSecondInnings = useCallback(async (
    battingTeamId: string, 
    batsmanId: string, 
    bowlerId: string
  ) => {
    if (!match) return;
    
    try {
      const bowlingTeamId = battingTeamId === match.team1_id ? match.team2_id : match.team1_id;

      // Create second innings
      const { data: newInnings, error: inningsError } = await supabase
        .from('innings')
        .insert({
          match_id: match.id,
          innings_number: 2,
          batting_team_id: battingTeamId,
          bowling_team_id: bowlingTeamId,
          total_runs: 0,
          total_wickets: 0,
          total_overs_completed: 0,
          total_extras: 0,
          is_completed: false
        })
        .select()
        .single();

      if (inningsError) throw inningsError;

      // Create first over
      const { data: newOver, error: overError } = await supabase
        .from('overs')
        .insert({
          innings_id: newInnings.id,
          over_number: 1,
          bowler_id: bowlerId,
          runs_conceded: 0,
          wickets_taken: 0,
          is_completed: false
        })
        .select()
        .single();

      if (overError) throw overError;

      // Create batsman stats
      const { data: newBatsmanStats } = await supabase
        .from('batsman_innings_stats')
        .insert({
          innings_id: newInnings.id,
          batsman_id: batsmanId,
          runs_scored: 0,
          balls_faced: 0,
          fours: 0,
          sixes: 0,
          is_out: false,
          batting_order: 1
        })
        .select()
        .single();

      // Create bowler stats
      const { data: newBowlerStats } = await supabase
        .from('bowler_innings_stats')
        .insert({
          innings_id: newInnings.id,
          bowler_id: bowlerId,
          overs_bowled: 0,
          runs_conceded: 0,
          wickets_taken: 0,
          wides: 0,
          no_balls: 0
        })
        .select()
        .single();

      // Load players
      const [batsmanRes, bowlerRes] = await Promise.all([
        supabase.from('players').select('*').eq('id', batsmanId).single(),
        supabase.from('players').select('*').eq('id', bowlerId).single()
      ]);

      setCurrentInnings(newInnings);
      setCurrentOver(newOver);
      setCurrentBatsman(batsmanRes.data);
      setCurrentBowler(bowlerRes.data);
      setBatsmanStats(newBatsmanStats);
      setBowlerStats(newBowlerStats);
      setDeliveries([]);
      setLegalBallCount(0);
      setDismissedBatsmanIds([]);
      setShowInningsSummary(false);

    } catch (error) {
      console.error('Error starting second innings:', error);
      toast.error('Failed to start second innings');
    }
  }, [match]);

  return {
    match,
    currentInnings,
    currentOver,
    currentBatsman,
    currentBowler,
    batsmanStats,
    bowlerStats,
    deliveries,
    legalBallCount,
    isProcessingDelivery,
    isLoading,
    dismissedBatsmanIds,
    recordDelivery,
    selectNewBatsman,
    selectNewBowler,
    startSecondInnings,
    loadMatch,
    endInningsManually,
    endMatchManually,
    openBowlerModal,
    showBatsmanModal,
    showBowlerModal,
    showInningsSummary,
    showMatchResult,
    setShowBatsmanModal,
    setShowBowlerModal,
    setShowInningsSummary,
    setShowMatchResult,
    pendingBowlerChange
  };
}