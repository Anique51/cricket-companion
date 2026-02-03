import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Innings, Team } from '@/types/cricket';
import { useState, useEffect, useMemo } from 'react';
import { 
  getMatch,
  getMatchInnings,
  getDeliveryEvents,
  getBatsmenState,
  getBowlersState,
  getTeamPlayers,
} from '@/lib/localDb';
import { deriveInningsState } from '@/lib/matchEngine';

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
    if (!innings || !innings.match_id) return;

    try {
      // Load from local IndexedDB
      const localMatch = await getMatch(innings.match_id);
      if (!localMatch) return;

      // Get all events for the first innings
      const allEvents = await getDeliveryEvents(innings.match_id, innings.innings_number);
      
      // Load players for names
      const team1Players = await getTeamPlayers(localMatch.team1Id);
      const team2Players = await getTeamPlayers(localMatch.team2Id);
      const playerNames = new Map<string, string>();
      [...team1Players, ...team2Players].forEach(p => playerNames.set(p.id, p.name));

      // Get batsmen and bowlers state
      const batsmenState = await getBatsmenState(innings.match_id, innings.innings_number);
      const bowlersState = await getBowlersState(innings.match_id, innings.innings_number);

      // Derive innings state
      const state = deriveInningsState(
        allEvents,
        innings.innings_number,
        innings.batting_team_id,
        innings.bowling_team_id,
        playerNames,
        batsmenState,
        bowlersState
      );

      // Find top scorer
      const batsmanStats = Array.from(state.batsmanStats.values());
      if (batsmanStats.length > 0) {
        const topBatsman = batsmanStats.reduce((best, curr) => 
          curr.runsScored > best.runsScored ? curr : best
        );
        setTopScorer({
          name: topBatsman.playerName,
          stat: `${topBatsman.runsScored} (${topBatsman.ballsFaced})`
        });
      }

      // Find top wicket taker
      const bowlerStats = Array.from(state.bowlerStats.values());
      if (bowlerStats.length > 0) {
        const topBowler = bowlerStats.reduce((best, curr) => 
          curr.wicketsTaken > best.wicketsTaken ? curr : best
        );
        if (topBowler.wicketsTaken > 0) {
          setTopWicketTaker({
            name: topBowler.playerName,
            stat: `${topBowler.wicketsTaken}/${topBowler.runsConceded} (${topBowler.oversBowled})`
          });
        }
      }
    } catch (error) {
      console.error('Error loading top performers:', error);
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
