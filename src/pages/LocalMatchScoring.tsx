import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLocalMatch } from '@/hooks/useLocalMatch';
import { LocalScoreCard } from '@/components/cricket/LocalScoreCard';
import { LocalBatsmanCard } from '@/components/cricket/LocalBatsmanCard';
import { LocalBowlerCard } from '@/components/cricket/LocalBowlerCard';
import { LocalOverTimeline } from '@/components/cricket/LocalOverTimeline';
import { LocalScoringButtons } from '@/components/cricket/LocalScoringButtons';
import { UndoButton } from '@/components/cricket/UndoButton';
import { SyncButton } from '@/components/cricket/SyncButton';
import { NoBallModal } from '@/components/cricket/NoBallModal';
import { PlayerSelectModal } from '@/components/cricket/PlayerSelectModal';
import { InningsSummaryModal } from '@/components/cricket/InningsSummaryModal';
import { MatchResultModal } from '@/components/cricket/MatchResultModal';
import { SecondInningsSetup } from '@/components/cricket/SecondInningsSetup';
import { FullScorecard } from '@/components/cricket/FullScorecard';
import { CompletedMatchScorecard } from '@/components/cricket/CompletedMatchScorecard';
import { MainLayout } from '@/components/layout/MainLayout';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { Team, Innings } from '@/types/cricket';
import { ChevronLeft, MoreVertical, FileText, StopCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function LocalMatchScoring() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  
  const {
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
    isLoading,
    canUndo,
    dismissedBatsmanIds,
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
    showBatsmanModal,
    showBowlerModal,
    showInningsSummary,
    showMatchResult,
    showNoBallModal,
    setShowInningsSummary,
    setShowNoBallModal,
    handleNoBallOption,
  } = useLocalMatch();

  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);
  const [showSecondInningsSetup, setShowSecondInningsSetup] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);

  // Load match on mount
  useEffect(() => {
    if (matchId) {
      loadMatch(matchId);
    }
  }, [matchId, loadMatch]);

  // Load teams when match is loaded
  useEffect(() => {
    if (match) {
      loadTeams();
    }
  }, [match]);

  const loadTeams = async () => {
    if (!match) return;
    
    const [t1Res, t2Res] = await Promise.all([
      supabase.from('teams').select('*').eq('id', match.team1Id).single(),
      supabase.from('teams').select('*').eq('id', match.team2Id).single(),
    ]);
    
    if (t1Res.data) setTeam1(t1Res.data);
    if (t2Res.data) setTeam2(t2Res.data);
  };

  const handleStartSecondInnings = async () => {
    setShowInningsSummary(false);
    setShowSecondInningsSetup(true);
  };

  const handleSecondInningsStart = async (battingTeamId: string, batsmanId: string, bowlerId: string) => {
    await startSecondInnings(battingTeamId, batsmanId, bowlerId);
    setShowSecondInningsSetup(false);
  };

  // Get batting team name
  const battingTeamName = currentInnings 
    ? (currentInnings.battingTeamId === match?.team1Id ? match?.team1Name : match?.team2Name) || 'Batting Team'
    : 'Batting Team';

  if (isLoading) {
    return (
      <MainLayout hideNav>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading match...</div>
        </div>
      </MainLayout>
    );
  }

  // Create first innings object for SecondInningsSetup
  const firstInningsForSetup: Innings | null = firstInningsRuns !== null ? {
    id: '',
    match_id: match?.id || '',
    innings_number: 1,
    batting_team_id: currentInnings?.battingTeamId === match?.team1Id ? match?.team2Id || '' : match?.team1Id || '',
    bowling_team_id: currentInnings?.battingTeamId || '',
    total_runs: firstInningsRuns,
    total_wickets: 0,
    total_overs_completed: 0,
    total_extras: 0,
    is_completed: true,
    created_at: '',
  } : null;

  if (showSecondInningsSetup && match && firstInningsForSetup) {
    return (
      <SecondInningsSetup
        match={{
          id: match.id,
          team1_id: match.team1Id,
          team2_id: match.team2Id,
          total_overs: match.totalOvers,
          status: match.status.toLowerCase(),
          winner_team_id: match.winnerId,
          result_description: match.resultDescription,
          created_at: new Date(match.createdAt).toISOString(),
          completed_at: match.completedAt ? new Date(match.completedAt).toISOString() : null,
        }}
        firstInnings={firstInningsForSetup}
        team1={team1}
        team2={team2}
        onStart={handleSecondInningsStart}
        onCancel={() => setShowSecondInningsSetup(false)}
      />
    );
  }

  const matchCompleted = match?.status === 'COMPLETED' || match?.status === 'PENDING_SYNC';

  // For completed matches, show scorecard directly
  if (matchCompleted && match) {
    return (
      <MainLayout hideNav>
        {/* Header */}
        <header className="sticky top-0 z-10 bg-field-gradient text-primary-foreground">
          <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="font-bold">
                  {match.team1ShortName} vs {match.team2ShortName}
                </h1>
                <p className="text-xs opacity-80">
                  {match.totalOvers} overs match • Completed
                </p>
              </div>
            </div>
            
            <SyncButton 
              onSync={syncMatch}
              isPendingSync={match.status === 'PENDING_SYNC'}
              isSynced={match.syncedAt !== null}
            />
          </div>
        </header>

        <main className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">
          {/* Match Result */}
          <div className="card-score text-center py-6">
            <p className="text-sm text-muted-foreground mb-1">Result</p>
            <p className="text-xl font-bold text-primary">{match.resultDescription}</p>
          </div>

          {/* Inline Full Scorecard */}
          <CompletedMatchScorecard matchId={matchId || ''} team1={team1} team2={team2} />
        </main>
      </MainLayout>
    );
  }

  // Create innings summary innings object
  const inningsSummaryInnings: Innings | null = currentInnings ? {
    id: '',
    match_id: match?.id || '',
    innings_number: currentInnings.inningsNumber,
    batting_team_id: currentInnings.battingTeamId,
    bowling_team_id: currentInnings.bowlingTeamId,
    total_runs: currentInnings.totalRuns,
    total_wickets: currentInnings.totalWickets,
    total_overs_completed: currentInnings.totalOversCompleted,
    total_extras: currentInnings.totalExtras,
    is_completed: currentInnings.isCompleted,
    created_at: '',
  } : null;

  // Get batting team for innings summary
  const battingTeamForSummary = currentInnings?.battingTeamId === team1?.id ? team1 : team2;

  return (
    <MainLayout hideNav>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-field-gradient text-primary-foreground">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="font-bold">
                {match?.team1ShortName || team1?.short_name || team1?.name} vs {match?.team2ShortName || team2?.short_name || team2?.name}
              </h1>
              <p className="text-xs opacity-80">
                {match?.totalOvers} overs match
                {currentInnings && ` • Over ${currentInnings.currentOverNumber}`}
              </p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowScorecard(true)}>
                <FileText className="w-4 h-4 mr-2" /> View Scorecard
              </DropdownMenuItem>
              {currentInnings && (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <StopCircle className="w-4 h-4 mr-2" /> End Innings
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>End Innings?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will end the current innings. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={endInningsManually}>End Innings</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                        <StopCircle className="w-4 h-4 mr-2" /> End Match
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>End Match?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will end the match immediately. The current score will be saved. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={endMatchManually} className="bg-destructive hover:bg-destructive/90">End Match</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Score Card */}
        <LocalScoreCard 
          innings={currentInnings}
          battingTeamName={battingTeamName}
          totalOvers={match?.totalOvers || 10}
          target={target}
        />

        {/* Player Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LocalBatsmanCard batsman={currentBatsman} stats={batsmanStats} />
          <LocalBowlerCard 
            bowler={currentBowler} 
            stats={bowlerStats} 
            currentOverBalls={legalBallCount} 
            onSelectBowler={openBowlerModal}
          />
        </div>

        {/* Over Timeline */}
        <LocalOverTimeline deliveries={currentOverDeliveries} legalBallCount={legalBallCount} />

        {/* Scoring Buttons */}
        <LocalScoringButtons 
          onScore={recordDelivery}
          disabled={!currentBatsman || !currentBowler}
        />
        
        {/* Undo Button */}
        <UndoButton 
          onUndo={undoLastDelivery}
          disabled={!canUndo}
        />
      </main>

      {/* Modals */}
      <PlayerSelectModal
        open={showBatsmanModal}
        onSelect={selectNewBatsman}
        title="Select New Batsman"
        teamId={currentInnings?.battingTeamId || ''}
        excludePlayerIds={dismissedBatsmanIds}
        type="batsman"
      />

      <PlayerSelectModal
        open={showBowlerModal}
        onSelect={selectNewBowler}
        title="Select Bowler for Next Over"
        teamId={currentInnings?.bowlingTeamId || ''}
        type="bowler"
      />

      <NoBallModal
        open={showNoBallModal}
        onSelect={handleNoBallOption}
        onClose={() => setShowNoBallModal(false)}
      />

      <InningsSummaryModal
        open={showInningsSummary}
        innings={inningsSummaryInnings}
        battingTeam={battingTeamForSummary}
        onStartSecondInnings={handleStartSecondInnings}
      />

      <MatchResultModal
        open={showMatchResult}
        match={match ? {
          id: match.id,
          team1_id: match.team1Id,
          team2_id: match.team2Id,
          total_overs: match.totalOvers,
          status: 'completed',
          winner_team_id: match.winnerId,
          result_description: match.resultDescription,
          created_at: new Date(match.createdAt).toISOString(),
          completed_at: match.completedAt ? new Date(match.completedAt).toISOString() : null,
        } : null}
        team1={team1}
        team2={team2}
      />

      <FullScorecard
        open={showScorecard}
        onClose={() => setShowScorecard(false)}
        matchId={matchId || ''}
        team1={team1}
        team2={team2}
      />
    </MainLayout>
  );
}
