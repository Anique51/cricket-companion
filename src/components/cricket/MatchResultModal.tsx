import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Match, Innings, Team } from '@/types/cricket';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy } from 'lucide-react';

interface MatchResultModalProps {
  open: boolean;
  match: Match | null;
  team1: Team | null;
  team2: Team | null;
}

export function MatchResultModal({ open, match, team1, team2 }: MatchResultModalProps) {
  const navigate = useNavigate();
  const [innings1, setInnings1] = useState<Innings | null>(null);
  const [innings2, setInnings2] = useState<Innings | null>(null);
  const [winnerTeam, setWinnerTeam] = useState<Team | null>(null);

  useEffect(() => {
    if (open && match) {
      loadMatchData();
    }
  }, [open, match]);

  const loadMatchData = async () => {
    if (!match) return;

    const { data: inningsData } = await supabase
      .from('innings')
      .select('*')
      .eq('match_id', match.id)
      .order('innings_number');

    if (inningsData) {
      setInnings1(inningsData[0] || null);
      setInnings2(inningsData[1] || null);
    }

    if (match.winner_team_id) {
      if (team1?.id === match.winner_team_id) {
        setWinnerTeam(team1);
      } else if (team2?.id === match.winner_team_id) {
        setWinnerTeam(team2);
      }
    }
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'Unknown';
    if (team1?.id === teamId) return team1.name;
    if (team2?.id === teamId) return team2.name;
    return 'Unknown';
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            Match Complete
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Winner */}
          {winnerTeam && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 mb-3">
                <Trophy className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-2xl font-black text-foreground">
                {winnerTeam.name}
              </h2>
              <p className="text-muted-foreground mt-1">
                {match?.result_description}
              </p>
            </div>
          )}

          {/* Scores */}
          <div className="space-y-3">
            {innings1 && (
              <div className="card-player">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{getTeamName(innings1.batting_team_id)}</span>
                  <span className="font-bold text-lg">
                    {innings1.total_runs}/{innings1.total_wickets}
                    <span className="text-sm text-muted-foreground ml-1">
                      ({innings1.total_overs_completed.toFixed(1)}ov)
                    </span>
                  </span>
                </div>
              </div>
            )}
            
            {innings2 && (
              <div className="card-player">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{getTeamName(innings2.batting_team_id)}</span>
                  <span className="font-bold text-lg">
                    {innings2.total_runs}/{innings2.total_wickets}
                    <span className="text-sm text-muted-foreground ml-1">
                      ({innings2.total_overs_completed.toFixed(1)}ov)
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => navigate('/')}
              className="flex-1 h-14"
            >
              Home
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')}
              className="flex-1 h-14"
            >
              Dashboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}