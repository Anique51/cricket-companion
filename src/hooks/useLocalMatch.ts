// Local-First Match Hook - Instant UI updates, no network in scoring path
import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

import {
  initDB,
  generateId,
  addDeliveryEvent,
  removeLastDeliveryEvent,
  getDeliveryEvents,
  saveMatch,
  getMatch,
  saveInnings,
  getInnings,
  savePlayers,
  getTeamPlayers,
  saveBatsmanState,
  getBatsmenState,
  saveBowlerState,
  getBowlersState,
  getPlayer,
  type DeliveryEvent,
  type LocalMatch,
  type LocalInnings,
  type LocalPlayer,
  type LocalBatsmanState,
  type LocalBowlerState,
} from '@/lib/localDb';

import {
  deriveInningsState,
  getEventTypeForAction,
  getNextOverNumber,
  calculateRunRate,
  calculateRequiredRunRate,
  formatOvers,
  checkInningsEnd,
  checkChasingWin,
  calculateMatchResult,
  type InningsState,
  type BatsmanStats,
  type BowlerStats,
  type OverDelivery,
} from '@/lib/matchEngine';

import { syncMatchToSupabase } from '@/lib/syncManager';

export type ScoringAction = 'dot' | 'four' | 'six' | 'wide' | 'noball' | 'noball_four' | 'noball_six' | 'wicket';

export interface UseLocalMatchReturn {
  // Match state
  match: LocalMatch | null;
  currentInnings: InningsState | null;
  firstInningsRuns: number | null;
  target: number | null;
  
  // Current players
  currentBatsman: LocalPlayer | null;
  currentBowler: LocalPlayer | null;
  batsmanStats: BatsmanStats | null;
  bowlerStats: BowlerStats | null;
  
  // Over state
  currentOverDeliveries: OverDelivery[];
  legalBallCount: number;
  
  // Calculated values
  currentRunRate: number;
  requiredRunRate: number | null;
  oversDisplay: string;
  
  // UI state
  isLoading: boolean;
  canUndo: boolean;
  dismissedBatsmanIds: string[];
  retiredBatsmanIds: string[];
  
  // Actions
  recordDelivery: (action: ScoringAction) => void;
  undoLastDelivery: () => void;
  selectNewBatsman: (playerId: string) => Promise<void>;
  selectNewBowler: (playerId: string) => Promise<void>;
  startSecondInnings: (battingTeamId: string, batsmanId: string, bowlerId: string) => Promise<void>;
  loadMatch: (matchId: string) => Promise<void>;
  endInningsManually: () => Promise<void>;
  endMatchManually: (winnerId: string) => Promise<void>;
  syncMatch: () => Promise<boolean>;
  openBowlerModal: () => void;
  startRematch: () => Promise<string | null>;
  retireCurrentBatsman: () => void;
  
  // Modals
  showBatsmanModal: boolean;
  showBowlerModal: boolean;
  showInningsSummary: boolean;
  showMatchResult: boolean;
  showNoBallModal: boolean;
  showRetireModal: boolean;
  setShowBatsmanModal: (show: boolean) => void;
  setShowBowlerModal: (show: boolean) => void;
  setShowInningsSummary: (show: boolean) => void;
  setShowMatchResult: (show: boolean) => void;
  setShowNoBallModal: (show: boolean) => void;
  setShowRetireModal: (show: boolean) => void;
  handleNoBallOption: (option: 'noball' | 'noball_four' | 'noball_six') => void;
  
  pendingBowlerChange: boolean;
  isRetiring: boolean;
  
  // Expose innings data for second innings setup
  innings1: LocalInnings | null;
  innings2: LocalInnings | null;
}

export function useLocalMatch(): UseLocalMatchReturn {
  // Core state
  const [match, setMatch] = useState<LocalMatch | null>(null);
  const [events, setEvents] = useState<DeliveryEvent[]>([]);
  const [firstInningsRuns, setFirstInningsRuns] = useState<number | null>(null);
  
  // Player state
  const [currentBatsman, setCurrentBatsman] = useState<LocalPlayer | null>(null);
  const [currentBowler, setCurrentBowler] = useState<LocalPlayer | null>(null);
  const [playerNames, setPlayerNames] = useState<Map<string, string>>(new Map());
  const [batsmenState, setBatsmenState] = useState<LocalBatsmanState[]>([]);
  const [bowlersState, setBowlersState] = useState<LocalBowlerState[]>([]);
  
  // Current innings number
  const [currentInningsNumber, setCurrentInningsNumber] = useState(1);
  const [innings1, setInnings1] = useState<LocalInnings | null>(null);
  const [innings2, setInnings2] = useState<LocalInnings | null>(null);
  
  // Team sizes
  const [teamSizes, setTeamSizes] = useState<Map<string, number>>(new Map());
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showBatsmanModal, setShowBatsmanModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [showInningsSummary, setShowInningsSummary] = useState(false);
  const [showMatchResult, setShowMatchResult] = useState(false);
  const [showNoBallModal, setShowNoBallModal] = useState(false);
  const [showRetireModal, setShowRetireModal] = useState(false);
  const [pendingBowlerChange, setPendingBowlerChange] = useState(false);
  const [isRetiring, setIsRetiring] = useState(false);
  const [retiredBatsmanIds, setRetiredBatsmanIds] = useState<string[]>([]);

  // Initialize IndexedDB
  useEffect(() => {
    initDB().catch(console.error);
  }, []);

  // Derive current innings state from events (INSTANT - no async)
  const currentInnings = useMemo(() => {
    if (!match) return null;
    
    const innings = currentInningsNumber === 1 ? innings1 : innings2;
    if (!innings) return null;
    
    const inningsEvents = events.filter(e => e.inningsNumber === currentInningsNumber);
    
    return deriveInningsState(
      inningsEvents,
      currentInningsNumber,
      innings.battingTeamId,
      innings.bowlingTeamId,
      playerNames,
      batsmenState,
      bowlersState
    );
  }, [events, currentInningsNumber, match, innings1, innings2, playerNames, batsmenState, bowlersState]);

  // Target for second innings
  const target = useMemo(() => {
    if (currentInningsNumber === 2 && firstInningsRuns !== null) {
      return firstInningsRuns + 1;
    }
    return null;
  }, [currentInningsNumber, firstInningsRuns]);

  // Batsman/Bowler stats from current innings
  const batsmanStats = useMemo(() => {
    if (!currentInnings || !currentBatsman) return null;
    return currentInnings.batsmanStats.get(currentBatsman.id) || null;
  }, [currentInnings, currentBatsman]);

  const bowlerStats = useMemo(() => {
    if (!currentInnings || !currentBowler) return null;
    return currentInnings.bowlerStats.get(currentBowler.id) || null;
  }, [currentInnings, currentBowler]);

  // Current over deliveries
  const currentOverDeliveries = useMemo(() => {
    return currentInnings?.currentOverDeliveries || [];
  }, [currentInnings]);

  const legalBallCount = useMemo(() => {
    return currentInnings?.currentOverBalls || 0;
  }, [currentInnings]);

  // Calculated values
  const currentRunRate = useMemo(() => {
    if (!currentInnings) return 0;
    return calculateRunRate(
      currentInnings.totalRuns,
      currentInnings.totalOversCompleted,
      currentInnings.currentOverBalls
    );
  }, [currentInnings]);

  const requiredRunRate = useMemo(() => {
    if (!currentInnings || !target || !match) return null;
    return calculateRequiredRunRate(
      target,
      currentInnings.totalRuns,
      match.totalOvers,
      currentInnings.totalOversCompleted,
      currentInnings.currentOverBalls
    );
  }, [currentInnings, target, match]);

  const oversDisplay = useMemo(() => {
    if (!currentInnings) return '0.0';
    return formatOvers(currentInnings.totalOversCompleted, currentInnings.currentOverBalls);
  }, [currentInnings]);

  const canUndo = useMemo(() => {
    const inningsEvents = events.filter(e => e.inningsNumber === currentInningsNumber);
    return inningsEvents.length > 0;
  }, [events, currentInningsNumber]);

  const dismissedBatsmanIds = useMemo(() => {
    return Array.from(currentInnings?.dismissedBatsmanIds || []);
  }, [currentInnings]);

  // Load match from LOCAL IndexedDB only
  const loadMatch = useCallback(async (matchId: string) => {
    setIsLoading(true);
    try {
      await initDB();
      
      // Load match from local IndexedDB
      const localMatch = await getMatch(matchId);
      
      if (!localMatch) {
        toast.error('Match not found in local storage');
        setIsLoading(false);
        return;
      }
      
      setMatch(localMatch);
      
      // Load player names from local IndexedDB
      const team1Players = await getTeamPlayers(localMatch.team1Id);
      const team2Players = await getTeamPlayers(localMatch.team2Id);
      const allPlayers = [...team1Players, ...team2Players];
      
      const names = new Map<string, string>();
      allPlayers.forEach(p => names.set(p.id, p.name));
      setPlayerNames(names);
      
      // Set team sizes
      const sizes = new Map<string, number>();
      sizes.set(localMatch.team1Id, team1Players.length);
      sizes.set(localMatch.team2Id, team2Players.length);
      setTeamSizes(sizes);
      
      // Load innings data
      const ing1 = await getInnings(matchId, 1);
      const ing2 = await getInnings(matchId, 2);
      setInnings1(ing1);
      setInnings2(ing2);
      
      // Load all events
      const allEvents = await getDeliveryEvents(matchId);
      setEvents(allEvents);
      
      // Determine current innings number
      let activeInningsNumber = 1;
      if (ing2 && !ing2.isCompleted) {
        activeInningsNumber = 2;
        // Calculate first innings runs for target
        const ing1Events = allEvents.filter(e => e.inningsNumber === 1);
        const ing1State = deriveInningsState(
          ing1Events, 1, ing1!.battingTeamId, ing1!.bowlingTeamId, 
          names, [], []
        );
        setFirstInningsRuns(ing1State.totalRuns);
      } else if (ing1 && ing1.isCompleted && !ing2) {
        // First innings complete, waiting for second
        activeInningsNumber = 1;
        const ing1Events = allEvents.filter(e => e.inningsNumber === 1);
        const ing1State = deriveInningsState(
          ing1Events, 1, ing1.battingTeamId, ing1.bowlingTeamId, 
          names, [], []
        );
        setFirstInningsRuns(ing1State.totalRuns);
        setShowInningsSummary(true);
      }
      setCurrentInningsNumber(activeInningsNumber);
      
      // Load batsmen and bowlers state
      const batsmen = await getBatsmenState(matchId, activeInningsNumber);
      const bowlers = await getBowlersState(matchId, activeInningsNumber);
      setBatsmenState(batsmen);
      setBowlersState(bowlers);
      
      // Find current batsman (not out)
      if (batsmen.length > 0) {
        const notOutBatsman = batsmen.find(b => !b.isOut);
        if (notOutBatsman) {
          const player = await getPlayer(notOutBatsman.playerId);
          setCurrentBatsman(player);
        }
      }
      
      // Find current bowler from bowler state or last event
      if (bowlers.length > 0) {
        const inningsEvents = allEvents.filter(e => e.inningsNumber === activeInningsNumber);
        if (inningsEvents.length > 0) {
          const lastEvent = inningsEvents[inningsEvents.length - 1];
          const player = await getPlayer(lastEvent.bowlerId);
          setCurrentBowler(player);
        } else {
          // No events yet, use first bowler
          const firstBowler = bowlers[0];
          const player = await getPlayer(firstBowler.playerId);
          setCurrentBowler(player);
        }
      }
      
    } catch (error) {
      console.error('Error loading match:', error);
      toast.error('Failed to load match');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Record delivery - INSTANT, NO NETWORK
  const recordDelivery = useCallback((action: ScoringAction) => {
    if (!match || !currentBatsman || !currentBowler || !currentInnings) {
      return;
    }

    // Handle no-ball modal
    if (action === 'noball') {
      setShowNoBallModal(true);
      return;
    }

    const { eventType, runs, isLegal } = getEventTypeForAction(action);
    
    // Calculate the correct over number for this event
    const overNumber = getNextOverNumber(events, currentInningsNumber);
    const newLegalCount = isLegal ? legalBallCount + 1 : legalBallCount;

    // Create event IMMEDIATELY
    const event: DeliveryEvent = {
      id: generateId(),
      matchId: match.id,
      inningsNumber: currentInningsNumber,
      overNumber: overNumber,
      eventType,
      runsScored: runs,
      isLegalDelivery: isLegal,
      batsmanId: currentBatsman.id,
      bowlerId: currentBowler.id,
      timestamp: Date.now(),
    };

    // Update state INSTANTLY (sync)
    setEvents(prev => [...prev, event]);

    // Persist to IndexedDB (async, non-blocking)
    addDeliveryEvent(event).catch(console.error);

    // Check for over completion (only if this was a legal delivery)
    const isOverComplete = isLegal && newLegalCount >= 6;
    
    // Check for wicket
    if (action === 'wicket') {
      // Update batsman state
      const updatedBatsmanState: LocalBatsmanState = {
        playerId: currentBatsman.id,
        inningsNumber: currentInningsNumber,
        matchId: match.id,
        battingOrder: batsmenState.filter(b => b.inningsNumber === currentInningsNumber).length,
        isOut: true,
      };
      setBatsmenState(prev => prev.map(b => 
        b.playerId === currentBatsman.id && b.inningsNumber === currentInningsNumber
          ? updatedBatsmanState
          : b
      ));
      saveBatsmanState(updatedBatsmanState).catch(console.error);

      // Check if all out - this is the ONLY condition that ends innings on wicket
      const teamSize = teamSizes.get(currentInnings.battingTeamId) || 10;
      const newWickets = currentInnings.totalWickets + 1;
      
      if (newWickets >= teamSize) {
        // All out - end innings (regardless of whether over is complete)
        handleInningsEnd(isOverComplete);
        return;
      }
      
      // Not all out - need new batsman
      // Mark if we need bowler change after batsman selection
      if (isOverComplete) {
        // Check if this completes the last over of the innings
        if (currentInnings.totalOversCompleted + 1 >= match.totalOvers) {
          // Last over completed + wicket (but not all out) - end innings
          handleInningsEnd(true);
          return;
        }
        setPendingBowlerChange(true);
      }
      setShowBatsmanModal(true);
      return;
    }

    // Check for chasing win
    if (target && currentInnings.totalRuns + runs >= target) {
      handleMatchEnd();
      return;
    }

    // Check for over completion (non-wicket deliveries)
    if (isOverComplete) {
      // Check if it's the last over
      if (currentInnings.totalOversCompleted + 1 >= match.totalOvers) {
        handleInningsEnd(true);
      } else {
        setShowBowlerModal(true);
      }
    }
  }, [match, currentBatsman, currentBowler, currentInnings, currentInningsNumber, legalBallCount, target, teamSizes, batsmenState, events]);

  // Handle no-ball options
  const handleNoBallOption = useCallback((option: 'noball' | 'noball_four' | 'noball_six') => {
    setShowNoBallModal(false);
    
    if (!match || !currentBatsman || !currentBowler || !currentInnings) {
      return;
    }

    const { eventType, runs, isLegal } = getEventTypeForAction(option);
    
    // Calculate the correct over number
    const overNumber = getNextOverNumber(events, currentInningsNumber);

    const event: DeliveryEvent = {
      id: generateId(),
      matchId: match.id,
      inningsNumber: currentInningsNumber,
      overNumber: overNumber,
      eventType,
      runsScored: runs,
      isLegalDelivery: isLegal,
      batsmanId: currentBatsman.id,
      bowlerId: currentBowler.id,
      timestamp: Date.now(),
    };

    setEvents(prev => [...prev, event]);
    addDeliveryEvent(event).catch(console.error);

    // Check for chasing win
    if (target && currentInnings.totalRuns + runs >= target) {
      handleMatchEnd();
    }
  }, [match, currentBatsman, currentBowler, currentInnings, currentInningsNumber, target, events]);

  // Undo last delivery
  const undoLastDelivery = useCallback(async () => {
    if (!match || !canUndo) return;

    try {
      const removedEvent = await removeLastDeliveryEvent(match.id, currentInningsNumber);
      if (removedEvent) {
        setEvents(prev => prev.filter(e => e.id !== removedEvent.id));
        
        // If it was a wicket, restore batsman
        if (removedEvent.eventType === 'WICKET') {
          const player = await getPlayer(removedEvent.batsmanId);
          setCurrentBatsman(player);
          
          // Update batsman state back to not out
          setBatsmenState(prev => prev.map(b =>
            b.playerId === removedEvent.batsmanId && b.inningsNumber === currentInningsNumber
              ? { ...b, isOut: false }
              : b
          ));
          
          // Persist the undo to batsman state
          const batsmanToUpdate = batsmenState.find(
            b => b.playerId === removedEvent.batsmanId && b.inningsNumber === currentInningsNumber
          );
          if (batsmanToUpdate) {
            await saveBatsmanState({ ...batsmanToUpdate, isOut: false });
          }
        }
        
        toast.success('Last delivery undone');
      }
    } catch (error) {
      console.error('Error undoing delivery:', error);
      toast.error('Failed to undo delivery');
    }
  }, [match, canUndo, currentInningsNumber, batsmenState]);

  // Select new batsman
  const selectNewBatsman = useCallback(async (playerId: string) => {
    if (!match) return;
    
    const player = await getPlayer(playerId);
    if (player) {
      setCurrentBatsman(player);
      setPlayerNames(prev => new Map(prev).set(playerId, player.name));
    }

    // If this player was retired, remove from retired list (they're back)
    setRetiredBatsmanIds(prev => prev.filter(id => id !== playerId));

    // Check if this batsman already exists in state (e.g. returning from retire)
    const existsInState = batsmenState.some(
      b => b.playerId === playerId && b.inningsNumber === currentInningsNumber
    );

    if (!existsInState) {
      // Add to batsmen state only if new
      const newBatsmanState: LocalBatsmanState = {
        playerId,
        inningsNumber: currentInningsNumber,
        matchId: match.id,
        battingOrder: batsmenState.filter(b => b.inningsNumber === currentInningsNumber).length + 1,
        isOut: false,
      };
      setBatsmenState(prev => [...prev, newBatsmanState]);
      await saveBatsmanState(newBatsmanState);
    }
    
    setShowBatsmanModal(false);
    setShowRetireModal(false);
    setIsRetiring(false);
    
    if (pendingBowlerChange) {
      setPendingBowlerChange(false);

      if (currentInnings && match && currentInnings.totalOversCompleted >= match.totalOvers) {
        handleInningsEnd(true);
      } else {
        setShowBowlerModal(true);
      }
    }
  }, [match, currentInningsNumber, batsmenState, pendingBowlerChange, currentInnings]);

  // Select new bowler
  const selectNewBowler = useCallback(async (playerId: string) => {
    if (!match) return;
    
    const player = await getPlayer(playerId);
    if (player) {
      setCurrentBowler(player);
      setPlayerNames(prev => new Map(prev).set(playerId, player.name));
    }

    // Update bowler state
    const existingBowler = bowlersState.find(b => b.playerId === playerId && b.inningsNumber === currentInningsNumber);
    const newOverNumber = (currentInnings?.totalOversCompleted || 0) + 1;
    
    const bowlerState: LocalBowlerState = {
      playerId,
      inningsNumber: currentInningsNumber,
      matchId: match.id,
      overNumbers: existingBowler ? [...existingBowler.overNumbers, newOverNumber] : [newOverNumber],
    };
    
    setBowlersState(prev => {
      const filtered = prev.filter(b => !(b.playerId === playerId && b.inningsNumber === currentInningsNumber));
      return [...filtered, bowlerState];
    });
    await saveBowlerState(bowlerState);
    
    setShowBowlerModal(false);
  }, [match, currentInningsNumber, bowlersState, currentInnings]);

  // Handle innings end
  const handleInningsEnd = useCallback(async (isOverComplete: boolean) => {
    if (!match || !currentInnings) return;
    
    const currentInn = currentInningsNumber === 1 ? innings1 : innings2;
    if (!currentInn) return;
    
    // Mark innings complete
    const updatedInnings: LocalInnings = { ...currentInn, isCompleted: true };
    if (currentInningsNumber === 1) {
      setInnings1(updatedInnings);
    } else {
      setInnings2(updatedInnings);
    }
    await saveInnings(updatedInnings);
    
    if (currentInningsNumber === 1) {
      setFirstInningsRuns(currentInnings.totalRuns);
      setShowInningsSummary(true);
    } else {
      // Match complete
      handleMatchEnd();
    }
  }, [match, currentInnings, currentInningsNumber, innings1, innings2]);

  // Handle match end
  const handleMatchEnd = useCallback(async () => {
    if (!match) return;
    
    // Calculate result
    const teamSize = teamSizes.get(match.team1Id) || 10;
    
    // Get both innings states
    const inn1Events = events.filter(e => e.inningsNumber === 1);
    const inn2Events = events.filter(e => e.inningsNumber === 2);
    
    const inn1State = deriveInningsState(
      inn1Events, 1, innings1?.battingTeamId || '', innings1?.bowlingTeamId || '',
      playerNames, batsmenState, bowlersState
    );
    const inn2State = deriveInningsState(
      inn2Events, 2, innings2?.battingTeamId || '', innings2?.bowlingTeamId || '',
      playerNames, batsmenState, bowlersState
    );
    
    const result = calculateMatchResult(
      inn1State, inn2State,
      match.team1Name, match.team2Name, match.team1Id, match.team2Id, teamSize
    );
    
    const updatedMatch: LocalMatch = {
      ...match,
      status: 'PENDING_SYNC',
      winnerId: result.winnerId,
      resultDescription: result.resultDescription,
      completedAt: Date.now(),
    };
    
    setMatch(updatedMatch);
    await saveMatch(updatedMatch);
    
    // Mark both innings complete
    if (innings1) {
      const updated = { ...innings1, isCompleted: true };
      setInnings1(updated);
      await saveInnings(updated);
    }
    if (innings2) {
      const updated = { ...innings2, isCompleted: true };
      setInnings2(updated);
      await saveInnings(updated);
    }
    
    setShowMatchResult(true);
  }, [match, events, innings1, innings2, playerNames, batsmenState, bowlersState, teamSizes]);

  // Start second innings
  const startSecondInnings = useCallback(async (battingTeamId: string, batsmanId: string, bowlerId: string) => {
    if (!match) return;
    
    const bowlingTeamId = battingTeamId === match.team1Id ? match.team2Id : match.team1Id;
    
    // Create second innings
    const newInnings: LocalInnings = {
      matchId: match.id,
      inningsNumber: 2,
      battingTeamId,
      bowlingTeamId,
      isCompleted: false,
    };
    setInnings2(newInnings);
    await saveInnings(newInnings);
    
    // Reset batsmen and bowlers state for new innings
    setBatsmenState([]);
    setBowlersState([]);
    
    setCurrentInningsNumber(2);
    setShowInningsSummary(false);
    
    // Set up batsman and bowler
    await selectNewBatsman(batsmanId);
    await selectNewBowler(bowlerId);
  }, [match, selectNewBatsman, selectNewBowler]);

  // End innings manually
  const endInningsManually = useCallback(async () => {
    await handleInningsEnd(false);
  }, [handleInningsEnd]);

  // End match manually with winner selection
  const endMatchManually = useCallback(async (winnerId: string) => {
    if (!match) return;
    
    const winnerName = winnerId === match.team1Id ? match.team1Name : match.team2Name;
    
    const updatedMatch: LocalMatch = {
      ...match,
      status: 'PENDING_SYNC',
      winnerId,
      resultDescription: `${winnerName} Won`,
      completedAt: Date.now(),
    };
    
    setMatch(updatedMatch);
    await saveMatch(updatedMatch);
    
    // Mark innings complete
    if (innings1) {
      const updated = { ...innings1, isCompleted: true };
      setInnings1(updated);
      await saveInnings(updated);
    }
    if (innings2) {
      const updated = { ...innings2, isCompleted: true };
      setInnings2(updated);
      await saveInnings(updated);
    }
    
    setShowMatchResult(true);
  }, [match, innings1, innings2]);

  // Retire current batsman - show selection modal
  const retireCurrentBatsman = useCallback(() => {
    if (!currentBatsman) return;
    // Add current batsman to retired list
    setRetiredBatsmanIds(prev => [...prev, currentBatsman.id]);
    setIsRetiring(true);
    setShowRetireModal(true);
  }, [currentBatsman]);

  // Cancel retire - undo the retire action
  const handleSetShowRetireModal = useCallback((show: boolean) => {
    if (!show && isRetiring) {
      // User cancelled - remove last added retired batsman
      setRetiredBatsmanIds(prev => prev.slice(0, -1));
      setIsRetiring(false);
    }
    setShowRetireModal(show);
  }, [isRetiring]);

  // Sync match to Supabase
  const syncMatch = useCallback(async (): Promise<boolean> => {
    if (!match) return false;
    
    const result = await syncMatchToSupabase(match.id);
    if (result.success) {
      toast.success('Match synced successfully');
      setMatch(prev => prev ? { ...prev, status: 'COMPLETED', syncedAt: Date.now() } : null);
    } else {
      toast.error(result.error || 'Sync failed');
    }
    return result.success;
  }, [match]);

  // Open bowler modal
  const openBowlerModal = useCallback(() => {
    setShowBowlerModal(true);
  }, []);

  // Start rematch with same configuration
  const startRematch = useCallback(async (): Promise<string | null> => {
    if (!match) return null;
    
    try {
      const newMatchId = generateId();
      
      // Create new match with same config
      const newMatch: LocalMatch = {
        id: newMatchId,
        team1Id: match.team1Id,
        team2Id: match.team2Id,
        team1Name: match.team1Name,
        team2Name: match.team2Name,
        team1ShortName: match.team1ShortName,
        team2ShortName: match.team2ShortName,
        totalOvers: match.totalOvers,
        status: 'LIVE',
        winnerId: null,
        resultDescription: null,
        createdAt: Date.now(),
        completedAt: null,
        syncedAt: null,
      };
      
      await saveMatch(newMatch);
      
      return newMatchId;
    } catch (error) {
      console.error('Error starting rematch:', error);
      toast.error('Failed to start rematch');
      return null;
    }
  }, [match]);

  return {
    match,
    currentInnings,
    firstInningsRuns,
    target,
    currentBatsman,
    currentBowler,
    batsmanStats,
    bowlerStats,
    currentOverDeliveries,
    legalBallCount,
    currentRunRate,
    requiredRunRate,
    oversDisplay,
    isLoading,
    canUndo,
    dismissedBatsmanIds,
    retiredBatsmanIds,
    recordDelivery,
    undoLastDelivery,
    selectNewBatsman,
    selectNewBowler,
    startSecondInnings,
    loadMatch,
    endInningsManually,
    endMatchManually,
    syncMatch,
    openBowlerModal,
    startRematch,
    retireCurrentBatsman,
    showBatsmanModal,
    showBowlerModal,
    showInningsSummary,
    showMatchResult,
    showNoBallModal,
    showRetireModal,
    setShowBatsmanModal,
    setShowBowlerModal,
    setShowInningsSummary,
    setShowMatchResult,
    setShowNoBallModal,
    setShowRetireModal: handleSetShowRetireModal,
    handleNoBallOption,
    pendingBowlerChange,
    isRetiring,
    innings1,
    innings2,
  };
}
