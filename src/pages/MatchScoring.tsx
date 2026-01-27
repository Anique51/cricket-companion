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
import type { Team, Innings } from '@/types/cricket';
import { ChevronLeft } from 'lucide-react';

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
    setShowInningsSummary
  } = useCricketMatch();

  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);
  const [battingTeam, setBattingTeam] = useState<Team | null>(null);
  const [bowlingTeam, setBowlingTeam] = useState<Team | null>(null);
  const [firstInnings, setFirstInnings] = useState<Innings | null>(null);
  const [showSecondInningsSetup, setShowSecondInningsSetup] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading match...</div>
      </div>
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
    <div className="min-h-screen bg-background safe-top safe-bottom flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-field-gradient text-primary-foreground">
        <div className="flex items-center gap-3 p-4">
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
      </header>

      <main className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Score Card */}
        <ScoreCard 
          innings={currentInnings}
          battingTeam={battingTeam}
          totalOvers={match?.total_overs || 10}
          target={target}
        />

        {/* Player Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BatsmanCard batsman={currentBatsman} stats={batsmanStats} />
          <BowlerCard bowler={currentBowler} stats={bowlerStats} />
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
          </div>
        )}
      </main>

      {/* Modals */}
      <PlayerSelectModal
        open={showBatsmanModal}
        onSelect={selectNewBatsman}
        title="Select New Batsman"
        teamId={currentInnings?.batting_team_id || ''}
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
    </div>
  );
}