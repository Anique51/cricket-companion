import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import type { Team, Innings, Player } from '@/types/cricket';

interface CompletedMatchScorecardProps {
  matchId: string;
  team1: Team | null;
  team2: Team | null;
}

interface MatchBattingStat {
  id: string;
  match_id: string;
  innings_number: number;
  team_id: string;
  player_id: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  is_out: boolean;
  dismissal_type: string | null;
  batting_order: number;
}

interface MatchBowlingStat {
  id: string;
  match_id: string;
  innings_number: number;
  team_id: string;
  player_id: string;
  overs: number;
  runs_conceded: number;
  wickets: number;
  wides: number;
  no_balls: number;
}

interface BatsmanScoreRow {
  player: Player;
  stats: MatchBattingStat;
}

interface BowlerScoreRow {
  player: Player;
  stats: MatchBowlingStat;
}

interface InningsData {
  innings: Innings;
  battingTeam: Team;
  bowlingTeam: Team;
  batsmen: BatsmanScoreRow[];
  bowlers: BowlerScoreRow[];
}

export function CompletedMatchScorecard({ matchId, team1, team2 }: CompletedMatchScorecardProps) {
  const [inningsData, setInningsData] = useState<InningsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (matchId) {
      loadScorecard();
    }
  }, [matchId]);

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

      // Try to load from match-scoped stats tables first
      const { data: matchBattingStats } = await supabase
        .from('match_batting_stats')
        .select('*')
        .eq('match_id', matchId)
        .order('batting_order');

      const { data: matchBowlingStats } = await supabase
        .from('match_bowling_stats')
        .select('*')
        .eq('match_id', matchId)
        .order('overs', { ascending: false });

      const hasMatchScopedData = (matchBattingStats && matchBattingStats.length > 0) || 
                                  (matchBowlingStats && matchBowlingStats.length > 0);

      const inningsResults: InningsData[] = [];

      for (const inning of innings) {
        const battingTeam = inning.batting_team_id === team1?.id ? team1 : team2;
        const bowlingTeam = inning.bowling_team_id === team1?.id ? team1 : team2;

        let batsmen: BatsmanScoreRow[] = [];
        let bowlers: BowlerScoreRow[] = [];

        if (hasMatchScopedData) {
          // Use match-scoped stats
          const inningsBatting = matchBattingStats?.filter(s => s.innings_number === inning.innings_number) || [];
          const inningsBowling = matchBowlingStats?.filter(s => s.innings_number === inning.innings_number) || [];

          batsmen = inningsBatting.map(stats => ({
            player: playersMap.get(stats.player_id) as Player,
            stats: stats as MatchBattingStat
          })).filter(b => b.player);

          bowlers = inningsBowling.map(stats => ({
            player: playersMap.get(stats.player_id) as Player,
            stats: stats as MatchBowlingStat
          })).filter(b => b.player);
        } else {
          // Fallback to innings-scoped stats (for backwards compatibility)
          const { data: batsmanStats } = await supabase
            .from('batsman_innings_stats')
            .select('*')
            .eq('innings_id', inning.id)
            .order('batting_order');

          const { data: bowlerStats } = await supabase
            .from('bowler_innings_stats')
            .select('*')
            .eq('innings_id', inning.id)
            .order('overs_bowled', { ascending: false });

          batsmen = (batsmanStats || []).map(stats => ({
            player: playersMap.get(stats.batsman_id) as Player,
            stats: {
              id: stats.id,
              match_id: matchId,
              innings_number: inning.innings_number,
              team_id: inning.batting_team_id,
              player_id: stats.batsman_id,
              runs: stats.runs_scored,
              balls: stats.balls_faced,
              fours: stats.fours,
              sixes: stats.sixes,
              is_out: stats.is_out,
              dismissal_type: stats.is_out ? 'out' : null,
              batting_order: stats.batting_order
            } as MatchBattingStat
          })).filter(b => b.player);

          bowlers = (bowlerStats || []).map(stats => ({
            player: playersMap.get(stats.bowler_id) as Player,
            stats: {
              id: stats.id,
              match_id: matchId,
              innings_number: inning.innings_number,
              team_id: inning.bowling_team_id,
              player_id: stats.bowler_id,
              overs: stats.overs_bowled,
              runs_conceded: stats.runs_conceded,
              wickets: stats.wickets_taken,
              wides: stats.wides,
              no_balls: stats.no_balls
            } as MatchBowlingStat
          })).filter(b => b.player);
        }

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

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading scorecard...</div>;
  }

  if (inningsData.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No innings data available</div>;
  }

  return (
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
                  <div className="col-span-2 text-center font-bold">{row.stats.runs}</div>
                  <div className="col-span-2 text-center text-muted-foreground">{row.stats.balls}</div>
                  <div className="col-span-1 text-center text-cricket-four">{row.stats.fours}</div>
                  <div className="col-span-1 text-center text-cricket-six">{row.stats.sixes}</div>
                  <div className="col-span-1 text-center text-muted-foreground text-xs">
                    {row.stats.balls > 0 
                      ? ((row.stats.runs / row.stats.balls) * 100).toFixed(0)
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
                  <div className="col-span-2 text-center">{row.stats.overs}</div>
                  <div className="col-span-2 text-center">{row.stats.runs_conceded}</div>
                  <div className="col-span-2 text-center font-bold text-cricket-wicket">{row.stats.wickets}</div>
                  <div className="col-span-1 text-center text-muted-foreground text-xs">
                    {row.stats.overs > 0 
                      ? (row.stats.runs_conceded / row.stats.overs).toFixed(1)
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
  );
}