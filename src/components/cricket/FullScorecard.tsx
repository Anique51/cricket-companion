import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import type { Match, Team, Innings, Player, BatsmanInningsStats, BowlerInningsStats } from '@/types/cricket';
import { X } from 'lucide-react';

interface FullScorecardProps {
  open: boolean;
  onClose: () => void;
  matchId: string;
  team1: Team | null;
  team2: Team | null;
}

interface BatsmanScoreRow {
  player: Player;
  stats: BatsmanInningsStats;
}

interface BowlerScoreRow {
  player: Player;
  stats: BowlerInningsStats;
}

interface InningsData {
  innings: Innings;
  battingTeam: Team;
  bowlingTeam: Team;
  batsmen: BatsmanScoreRow[];
  bowlers: BowlerScoreRow[];
}

export function FullScorecard({ open, onClose, matchId, team1, team2 }: FullScorecardProps) {
  const [inningsData, setInningsData] = useState<InningsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && matchId) {
      loadScorecard();
    }
  }, [open, matchId]);

  const loadScorecard = async () => {
    setLoading(true);
    try {
      // Load all innings
      const { data: innings } = await supabase
        .from('innings')
        .select('*')
        .eq('match_id', matchId)
        .order('innings_number');

      if (!innings) return;

      // Load all players
      const { data: allPlayers } = await supabase.from('players').select('*');
      const playersMap = new Map(allPlayers?.map(p => [p.id, p]) || []);

      const inningsResults: InningsData[] = [];

      for (const inning of innings) {
        // Load batsman stats
        const { data: batsmanStats } = await supabase
          .from('batsman_innings_stats')
          .select('*')
          .eq('innings_id', inning.id)
          .order('batting_order');

        // Load bowler stats
        const { data: bowlerStats } = await supabase
          .from('bowler_innings_stats')
          .select('*')
          .eq('innings_id', inning.id)
          .order('overs_bowled', { ascending: false });

        const battingTeam = inning.batting_team_id === team1?.id ? team1 : team2;
        const bowlingTeam = inning.bowling_team_id === team1?.id ? team1 : team2;

        const batsmen: BatsmanScoreRow[] = (batsmanStats || []).map(stats => ({
          player: playersMap.get(stats.batsman_id) as Player,
          stats
        })).filter(b => b.player);

        const bowlers: BowlerScoreRow[] = (bowlerStats || []).map(stats => ({
          player: playersMap.get(stats.bowler_id) as Player,
          stats
        })).filter(b => b.player);

        if (battingTeam && bowlingTeam) {
          inningsResults.push({
            innings: inning,
            battingTeam,
            bowlingTeam,
            batsmen,
            bowlers
          });
        }
      }

      setInningsData(inningsResults);
    } catch (error) {
      console.error('Error loading scorecard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg mx-auto max-h-[90vh] overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Full Scorecard</DialogTitle>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading scorecard...</div>
          ) : inningsData.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No innings data available</div>
          ) : (
            <Tabs defaultValue="0" className="w-full">
              <TabsList className="w-full grid grid-cols-2 mb-4">
                {inningsData.map((data, idx) => (
                  <TabsTrigger key={idx} value={idx.toString()}>
                    {data.battingTeam.short_name || data.battingTeam.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {inningsData.map((data, idx) => (
                <TabsContent key={idx} value={idx.toString()} className="space-y-4">
                  {/* Team Score */}
                  <div className="text-center py-3 bg-primary/10 rounded-xl">
                    <h3 className="font-bold text-lg">{data.battingTeam.name}</h3>
                    <div className="text-3xl font-black text-primary">
                      {data.innings.total_runs}/{data.innings.total_wickets}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ({data.innings.total_overs_completed.toFixed(1)} overs)
                    </p>
                  </div>

                  {/* Batting */}
                  <div>
                    <h4 className="font-bold text-sm uppercase text-muted-foreground mb-2">Batting</h4>
                    <div className="bg-card rounded-xl border border-border overflow-hidden">
                      <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                        <div className="col-span-5">Batter</div>
                        <div className="col-span-2 text-center">R</div>
                        <div className="col-span-2 text-center">B</div>
                        <div className="col-span-1 text-center">4s</div>
                        <div className="col-span-1 text-center">6s</div>
                        <div className="col-span-1 text-center">SR</div>
                      </div>
                      {data.batsmen.map((row) => (
                        <div key={row.stats.id} className="grid grid-cols-12 gap-1 px-3 py-2 border-t border-border text-sm">
                          <div className="col-span-5 truncate">
                            <span className={row.stats.is_out ? 'text-muted-foreground' : 'font-medium'}>
                              {row.player.name}
                            </span>
                            {row.stats.is_out && <span className="text-xs text-destructive ml-1">out</span>}
                          </div>
                          <div className="col-span-2 text-center font-bold">{row.stats.runs_scored}</div>
                          <div className="col-span-2 text-center text-muted-foreground">{row.stats.balls_faced}</div>
                          <div className="col-span-1 text-center text-cricket-four">{row.stats.fours}</div>
                          <div className="col-span-1 text-center text-cricket-six">{row.stats.sixes}</div>
                          <div className="col-span-1 text-center text-muted-foreground text-xs">
                            {row.stats.balls_faced > 0 
                              ? ((row.stats.runs_scored / row.stats.balls_faced) * 100).toFixed(0)
                              : '-'
                            }
                          </div>
                        </div>
                      ))}
                      {data.batsmen.length === 0 && (
                        <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                          No batting data
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bowling */}
                  <div>
                    <h4 className="font-bold text-sm uppercase text-muted-foreground mb-2">Bowling</h4>
                    <div className="bg-card rounded-xl border border-border overflow-hidden">
                      <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                        <div className="col-span-5">Bowler</div>
                        <div className="col-span-2 text-center">O</div>
                        <div className="col-span-2 text-center">R</div>
                        <div className="col-span-2 text-center">W</div>
                        <div className="col-span-1 text-center">Econ</div>
                      </div>
                      {data.bowlers.map((row) => (
                        <div key={row.stats.id} className="grid grid-cols-12 gap-1 px-3 py-2 border-t border-border text-sm">
                          <div className="col-span-5 truncate font-medium">{row.player.name}</div>
                          <div className="col-span-2 text-center">{row.stats.overs_bowled}</div>
                          <div className="col-span-2 text-center">{row.stats.runs_conceded}</div>
                          <div className="col-span-2 text-center font-bold text-cricket-wicket">{row.stats.wickets_taken}</div>
                          <div className="col-span-1 text-center text-muted-foreground text-xs">
                            {row.stats.overs_bowled > 0 
                              ? (row.stats.runs_conceded / row.stats.overs_bowled).toFixed(1)
                              : '-'
                            }
                          </div>
                        </div>
                      ))}
                      {data.bowlers.length === 0 && (
                        <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                          No bowling data
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Extras */}
                  <div className="text-sm text-muted-foreground px-1">
                    Extras: {data.innings.total_extras}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
