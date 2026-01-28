import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCricketMatch } from '@/hooks/useCricketMatch';
import { ScoreCard } from '@/components/cricket/ScoreCard';
import { BatsmanCard } from '@/components/cricket/BatsmanCard';
import { BowlerCard } from '@/components/cricket/BowlerCard';
import { OverTimeline } from '@/components/cricket/OverTimeline';
import { ScoringButtons } from '@/components/cricket/ScoringButtons';
import { PlayerSelectModal } from '@/components/cricket/PlayerSelectModal';
import { InningsSummaryModal } from '@/components/cricket/InningsSummaryModal';
import { MatchResultModal } from '@/components/cricket/MatchResultModal';
import { SecondInningsSetup } from '@/components/cricket/SecondInningsSetup';
import { FullScorecard } from '@/components/cricket/FullScorecard';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { Team, Innings } from '@/types/cricket';
import { ChevronLeft, MoreVertical, FileText, StopCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function MatchScoring() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  
  const {
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
    recordDelivery,
    selectNewBatsman,
    selectNewBowler,
    startSecondInnings,
    loadMatch,
    showBatsmanModal,
    showBowlerModal,
    showInningsSummary,
    showMatchResult,
    setShowInningsSummary,
    endInningsManually,
    endMatchManually,
    dismissedBatsmanIds
  } = useCricketMatch();

  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);
  const [battingTeam, setBattingTeam] = useState<Team | null>(null);
  const [bowlingTeam, setBowlingTeam] = useState<Team | null>(null);
  const [firstInnings, setFirstInnings] = useState<Innings | null>(null);
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

  // Update batting/bowling teams when innings changes
  useEffect(() => {
    if (currentInnings && team1 && team2) {
      setBattingTeam(currentInnings.batting_team_id === team1.id ? team1 : team2);
      setBowlingTeam(currentInnings.bowling_team_id === team1.id ? team1 : team2);
    }
  }, [currentInnings, team1, team2]);

  // Load first innings for target calculation
  useEffect(() => {
    if (match && currentInnings?.innings_number === 2) {
      loadFirstInnings();
    }
  }, [match, currentInnings]);

  const loadTeams = async () => {
    if (!match) return;
    
    const { data: t1 } = await supabase
      .from('teams')
      .select('*')
      .eq('id', match.team1_id)
      .single();
    
    const { data: t2 } = await supabase
      .from('teams')
      .select('*')
      .eq('id', match.team2_id)
      .single();
    
    if (t1) setTeam1(t1);
    if (t2) setTeam2(t2);
  };

  const loadFirstInnings = async () => {
    if (!match) return;
    
    const { data } = await supabase
      .from('innings')
      .select('*')
      .eq('match_id', match.id)
      .eq('innings_number', 1)
      .single();
    
    if (data) setFirstInnings(data);
  };

  const handleStartSecondInnings = async () => {
    // Load first innings data for setup
    if (!match) return;
    
    const { data } = await supabase
      .from('innings')
      .select('*')
      .eq('match_id', match.id)
      .eq('innings_number', 1)
      .single();
    
    if (data) {
      setFirstInnings(data);
      setShowInningsSummary(false);
      setShowSecondInningsSetup(true);
    }
  };

  const handleSecondInningsStart = async (battingTeamId: string, batsmanId: string, bowlerId: string) => {
    await startSecondInnings(battingTeamId, batsmanId, bowlerId);
    setShowSecondInningsSetup(false);
  };

  // Calculate target for second innings
  const target = firstInnings && currentInnings?.innings_number === 2 
    ? firstInnings.total_runs + 1 
    : undefined;

  if (isLoading) {
    return (
      <MainLayout hideNav>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading match...</div>
        </div>
      </MainLayout>
    );
  }

  if (showSecondInningsSetup && match && firstInnings) {
    return (
      <SecondInningsSetup
        match={match}
        firstInnings={firstInnings}
        team1={team1}
        team2={team2}
        onStart={handleSecondInningsStart}
        onCancel={() => setShowSecondInningsSetup(false)}
      />
    );
  }

  const matchCompleted = match?.status === 'completed';

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
                {team1?.short_name || team1?.name} vs {team2?.short_name || team2?.name}
              </h1>
              <p className="text-xs opacity-80">
                {match?.total_overs} overs match
                {currentOver && ` • Over ${currentOver.over_number}`}
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
              {!matchCompleted && currentInnings && (
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
        <ScoreCard 
          innings={currentInnings}
          battingTeam={battingTeam}
          totalOvers={match?.total_overs || 10}
          target={target}
          currentOver={currentOver}
          legalBallCount={legalBallCount}
        />

        {/* Player Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BatsmanCard batsman={currentBatsman} stats={batsmanStats} />
          <BowlerCard bowler={currentBowler} stats={bowlerStats} currentOverBalls={legalBallCount} />
        </div>

        {/* Over Timeline */}
        <OverTimeline deliveries={deliveries} legalBallCount={legalBallCount} />

        {/* Scoring Buttons */}
        {!matchCompleted && (
          <ScoringButtons 
            onScore={recordDelivery}
            isProcessing={isProcessingDelivery}
            disabled={matchCompleted || !currentBatsman || !currentBowler}
          />
        )}

        {matchCompleted && (
          <div className="text-center py-8">
            <p className="text-lg font-medium text-muted-foreground">Match Completed</p>
            <p className="text-xl font-bold text-foreground mt-1">{match?.result_description}</p>
            <Button onClick={() => setShowScorecard(true)} variant="outline" className="mt-4">
              <FileText className="w-4 h-4 mr-2" /> View Full Scorecard
            </Button>
          </div>
        )}
      </main>

      {/* Modals */}
      <PlayerSelectModal
        open={showBatsmanModal}
        onSelect={selectNewBatsman}
        title="Select New Batsman"
        teamId={currentInnings?.batting_team_id || ''}
        excludePlayerIds={dismissedBatsmanIds}
        type="batsman"
      />

      <PlayerSelectModal
        open={showBowlerModal}
        onSelect={selectNewBowler}
        title="Select Bowler for Next Over"
        teamId={currentInnings?.bowling_team_id || ''}
        type="bowler"
      />

      <InningsSummaryModal
        open={showInningsSummary}
        innings={currentInnings}
        battingTeam={battingTeam}
        onStartSecondInnings={handleStartSecondInnings}
      />

      <MatchResultModal
        open={showMatchResult}
        match={match}
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
