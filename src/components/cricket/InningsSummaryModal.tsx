import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Innings, Team, BatsmanInningsStats, BowlerInningsStats } from '@/types/cricket';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface InningsSummaryModalProps {
  open: boolean;
  innings: Innings | null;
  battingTeam: Team | null;
  onStartSecondInnings: () => void;
}

interface TopPerformer {
  name: string;
  stat: string;
}

export function InningsSummaryModal({ 
  open, 
  innings, 
  battingTeam,
  onStartSecondInnings 
}: InningsSummaryModalProps) {
  const [topScorer, setTopScorer] = useState<TopPerformer | null>(null);
  const [topWicketTaker, setTopWicketTaker] = useState<TopPerformer | null>(null);

  useEffect(() => {
    if (open && innings) {
      loadTopPerformers();
    }
  }, [open, innings]);

  const loadTopPerformers = async () => {
    if (!innings) return;

    // Get top scorer
    const { data: batsmanStats } = await supabase
      .from('batsman_innings_stats')
      .select('runs_scored, balls_faced, batsman_id')
      .eq('innings_id', innings.id)
      .order('runs_scored', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (batsmanStats) {
      const { data: player } = await supabase
        .from('players')
        .select('name')
        .eq('id', batsmanStats.batsman_id)
        .single();
      
      if (player) {
        setTopScorer({
          name: player.name,
          stat: `${batsmanStats.runs_scored} (${batsmanStats.balls_faced}b)`
        });
      }
    }

    // Get top wicket taker
    const { data: bowlerStats } = await supabase
      .from('bowler_innings_stats')
      .select('wickets_taken, runs_conceded, overs_bowled, bowler_id')
      .eq('innings_id', innings.id)
      .order('wickets_taken', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bowlerStats && bowlerStats.wickets_taken > 0) {
      const { data: player } = await supabase
        .from('players')
        .select('name')
        .eq('id', bowlerStats.bowler_id)
        .single();
      
      if (player) {
        setTopWicketTaker({
          name: player.name,
          stat: `${bowlerStats.wickets_taken}/${bowlerStats.runs_conceded} (${bowlerStats.overs_bowled}ov)`
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            1st Innings Complete
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Final Score */}
          <div className="text-center">
            <h3 className="text-sm text-muted-foreground uppercase mb-1">
              {battingTeam?.name}
            </h3>
            <div className="score-display text-foreground">
              {innings?.total_runs}
              <span className="text-3xl text-muted-foreground">/{innings?.total_wickets}</span>
            </div>
            <p className="text-muted-foreground mt-1">
              ({innings?.total_overs_completed.toFixed(1)} overs)
            </p>
          </div>

          {/* Top Performers */}
          <div className="space-y-3">
            {topScorer && (
              <div className="card-player">
                <span className="text-xs text-muted-foreground uppercase">Top Scorer</span>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-medium">{topScorer.name}</span>
                  <span className="font-bold text-primary">{topScorer.stat}</span>
                </div>
              </div>
            )}
            
            {topWicketTaker && (
              <div className="card-player">
                <span className="text-xs text-muted-foreground uppercase">Top Bowler</span>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-medium">{topWicketTaker.name}</span>
                  <span className="font-bold text-cricket-wicket">{topWicketTaker.stat}</span>
                </div>
              </div>
            )}
          </div>

          {/* Target Info */}
          <div className="text-center p-4 bg-primary/10 rounded-xl">
            <span className="text-sm text-muted-foreground">Target for 2nd Innings</span>
            <div className="text-3xl font-black text-primary mt-1">
              {(innings?.total_runs || 0) + 1}
            </div>
          </div>

          <Button 
            onClick={onStartSecondInnings}
            className="w-full h-14 text-lg font-bold"
          >
            Start 2nd Innings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}