import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Match, Team } from '@/types/cricket';
import { useNavigate } from 'react-router-dom';
import { Trophy, RotateCcw, Home, LayoutDashboard } from 'lucide-react';
import { getDeliveryEvents, getInnings } from '@/lib/localDb';
import { deriveInningsState } from '@/lib/matchEngine';
import { useState, useEffect } from 'react';

interface MatchResultModalProps {
  open: boolean;
  match: Match | null;
  team1: Team | null;
  team2: Team | null;
  onRematch?: () => Promise<string | null>;
}

export function MatchResultModal({ open, match, team1, team2, onRematch }: MatchResultModalProps) {
  const navigate = useNavigate();
  const [innings1Score, setInnings1Score] = useState<{ runs: number; wickets: number; overs: string } | null>(null);
  const [innings2Score, setInnings2Score] = useState<{ runs: number; wickets: number; overs: string } | null>(null);

  useEffect(() => {
    if (open && match) {
      loadScores();
    }
  }, [open, match]);

  const loadScores = async () => {
    if (!match) return;

    try {
      const events = await getDeliveryEvents(match.id);
      const ing1 = await getInnings(match.id, 1);
      const ing2 = await getInnings(match.id, 2);

      if (ing1) {
        const ing1Events = events.filter(e => e.inningsNumber === 1);
        const state = deriveInningsState(ing1Events, 1, ing1.battingTeamId, ing1.bowlingTeamId, new Map(), [], []);
        setInnings1Score({
          runs: state.totalRuns,
          wickets: state.totalWickets,
          overs: `${state.totalOversCompleted}.${state.currentOverBalls}`,
        });
      }

      if (ing2) {
        const ing2Events = events.filter(e => e.inningsNumber === 2);
        const state = deriveInningsState(ing2Events, 2, ing2.battingTeamId, ing2.bowlingTeamId, new Map(), [], []);
        setInnings2Score({
          runs: state.totalRuns,
          wickets: state.totalWickets,
          overs: `${state.totalOversCompleted}.${state.currentOverBalls}`,
        });
      }
    } catch (error) {
      console.error('Error loading scores:', error);
    }
  };

  if (!match) return null;

  const winnerTeam = match.winner_team_id === team1?.id ? team1 : team2;

  const handleRematch = async () => {
    if (onRematch) {
      const newMatchId = await onRematch();
      if (newMatchId) {
        navigate(`/new-match?rematch=${newMatchId}&team1=${match.team1_id}&team2=${match.team2_id}&overs=${match.total_overs}`);
      }
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleDashboard = () => {
    navigate('/dashboard');
  };

  const getTeamName = (teamId: string) => {
    if (team1?.id === teamId) return team1.short_name || team1.name;
    if (team2?.id === teamId) return team2.short_name || team2.name;
    return 'Unknown';
  };

  return (
    <Dialog open={open} modal>
      <DialogContent className="max-w-sm mx-auto [&>button]:hidden">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl">Match Complete!</DialogTitle>
          {winnerTeam && (
            <DialogDescription className="text-base mt-2 text-primary font-semibold">
              {match.result_description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Scores Summary */}
        <div className="space-y-2 mt-4">
          {innings1Score && (
            <div className="card-player flex justify-between items-center">
              <span className="font-medium">{getTeamName(team1?.id === match.team1_id ? (innings1Score ? match.team1_id : match.team2_id) : match.team1_id)}</span>
              <span className="font-bold">
                {innings1Score.runs}/{innings1Score.wickets}
                <span className="text-sm text-muted-foreground ml-1">({innings1Score.overs}ov)</span>
              </span>
            </div>
          )}
          {innings2Score && (
            <div className="card-player flex justify-between items-center">
              <span className="font-medium">{getTeamName(team1?.id === match.team1_id ? match.team2_id : match.team1_id)}</span>
              <span className="font-bold">
                {innings2Score.runs}/{innings2Score.wickets}
                <span className="text-sm text-muted-foreground ml-1">({innings2Score.overs}ov)</span>
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-3">
          {onRematch && (
            <Button 
              onClick={handleRematch}
              className="w-full h-12"
              variant="default"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Rematch (Same Teams & Overs)
            </Button>
          )}
          
          <div className="flex gap-3">
            <Button 
              onClick={handleGoHome}
              className="flex-1 h-12"
              variant="outline"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button 
              onClick={handleDashboard}
              className="flex-1 h-12"
              variant="outline"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
