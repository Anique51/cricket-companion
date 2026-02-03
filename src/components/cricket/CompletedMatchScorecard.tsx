import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  getMatch, 
  getMatchInnings, 
  getDeliveryEvents, 
  getBatsmenState, 
  getBowlersState,
  getTeamPlayers,
  type LocalPlayer 
} from '@/lib/localDb';
import { deriveInningsState, type InningsState, type BatsmanStats, type BowlerStats } from '@/lib/matchEngine';
import type { Team, Innings, Player } from '@/types/cricket';

interface CompletedMatchScorecardProps {
  matchId: string;
  team1: Team | null;
  team2: Team | null;
}

interface LocalInningsData {
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  totalWickets: number;
  totalOversCompleted: number;
  totalExtras: number;
  batsmanStats: BatsmanStats[];
  bowlerStats: BowlerStats[];
}

export function CompletedMatchScorecard({ matchId, team1, team2 }: CompletedMatchScorecardProps) {
  const [inningsData, setInningsData] = useState<LocalInningsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (matchId) {
      loadScorecard();
    }
  }, [matchId]);

  const loadScorecard = async () => {
    setLoading(true);
    try {
      // Try local data first
      const localMatch = await getMatch(matchId);
      
      if (localMatch) {
        // Load from local IndexedDB
        await loadFromLocal(localMatch);
      } else {
        // Fallback to Supabase
        await loadFromSupabase();
      }
    } catch (error) {
      console.error('Error loading scorecard:', error);
      // Try Supabase as fallback
      await loadFromSupabase();
    } finally {
      setLoading(false);
    }
  };

  const loadFromLocal = async (localMatch: any) => {
    const inningsList = await getMatchInnings(matchId);
    const allEvents = await getDeliveryEvents(matchId);
    
    // Load players for names
    const team1Players = await getTeamPlayers(localMatch.team1Id);
    const team2Players = await getTeamPlayers(localMatch.team2Id);
    const playerNames = new Map<string, string>();
    [...team1Players, ...team2Players].forEach(p => playerNames.set(p.id, p.name));

    const results: LocalInningsData[] = [];

    for (const innings of inningsList) {
      const inningsEvents = allEvents.filter(e => e.inningsNumber === innings.inningsNumber);
      const batsmenState = await getBatsmenState(matchId, innings.inningsNumber);
      const bowlersState = await getBowlersState(matchId, innings.inningsNumber);

      const state = deriveInningsState(
        inningsEvents,
        innings.inningsNumber,
        innings.battingTeamId,
        innings.bowlingTeamId,
        playerNames,
        batsmenState,
        bowlersState
      );

      results.push({
        inningsNumber: innings.inningsNumber,
        battingTeamId: innings.battingTeamId,
        bowlingTeamId: innings.bowlingTeamId,
        totalRuns: state.totalRuns,
        totalWickets: state.totalWickets,
        totalOversCompleted: state.totalOversCompleted,
        totalExtras: state.totalExtras,
        batsmanStats: Array.from(state.batsmanStats.values()),
        bowlerStats: Array.from(state.bowlerStats.values()),
      });
    }

    setInningsData(results);
  };

  const loadFromSupabase = async () => {
    // Load all innings
    const { data: innings } = await supabase
      .from('innings')
      .select('*')
      .eq('match_id', matchId)
      .order('innings_number');

    if (!innings || innings.length === 0) {
      setInningsData([]);
      return;
    }

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

    const results: LocalInningsData[] = [];

    for (const inning of innings) {
      let batsmanStats: BatsmanStats[] = [];
      let bowlerStats: BowlerStats[] = [];

      if (hasMatchScopedData) {
        // Use match-scoped stats
        const inningsBatting = matchBattingStats?.filter(s => s.innings_number === inning.innings_number) || [];
        const inningsBowling = matchBowlingStats?.filter(s => s.innings_number === inning.innings_number) || [];

        batsmanStats = inningsBatting.map(stats => ({
          playerId: stats.player_id,
          playerName: playersMap.get(stats.player_id)?.name || 'Unknown',
          runsScored: stats.runs,
          ballsFaced: stats.balls,
          fours: stats.fours,
          sixes: stats.sixes,
          isOut: stats.is_out,
          battingOrder: stats.batting_order,
        }));

        bowlerStats = inningsBowling.map(stats => ({
          playerId: stats.player_id,
          playerName: playersMap.get(stats.player_id)?.name || 'Unknown',
          oversBowled: stats.overs,
          ballsBowled: stats.overs * 6,
          runsConceded: stats.runs_conceded,
          wicketsTaken: stats.wickets,
          wides: stats.wides,
          noBalls: stats.no_balls,
        }));
      } else {
        // Fallback to innings-scoped stats
        const { data: batsmanData } = await supabase
          .from('batsman_innings_stats')
          .select('*')
          .eq('innings_id', inning.id)
          .order('batting_order');

        const { data: bowlerData } = await supabase
          .from('bowler_innings_stats')
          .select('*')
          .eq('innings_id', inning.id)
          .order('overs_bowled', { ascending: false });

        batsmanStats = (batsmanData || []).map(stats => ({
          playerId: stats.batsman_id,
          playerName: playersMap.get(stats.batsman_id)?.name || 'Unknown',
          runsScored: stats.runs_scored,
          ballsFaced: stats.balls_faced,
          fours: stats.fours,
          sixes: stats.sixes,
          isOut: stats.is_out,
          battingOrder: stats.batting_order,
        }));

        bowlerStats = (bowlerData || []).map(stats => ({
          playerId: stats.bowler_id,
          playerName: playersMap.get(stats.bowler_id)?.name || 'Unknown',
          oversBowled: stats.overs_bowled,
          ballsBowled: stats.overs_bowled * 6,
          runsConceded: stats.runs_conceded,
          wicketsTaken: stats.wickets_taken,
          wides: stats.wides,
          noBalls: stats.no_balls,
        }));
      }

      results.push({
        inningsNumber: inning.innings_number,
        battingTeamId: inning.batting_team_id,
        bowlingTeamId: inning.bowling_team_id,
        totalRuns: inning.total_runs,
        totalWickets: inning.total_wickets,
        totalOversCompleted: inning.total_overs_completed,
        totalExtras: inning.total_extras,
        batsmanStats,
        bowlerStats,
      });
    }

    setInningsData(results);
  };

  // Get team for an innings
  const getTeamForInnings = (battingTeamId: string): Team | null => {
    if (team1?.id === battingTeamId) return team1;
    if (team2?.id === battingTeamId) return team2;
    return null;
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
        {inningsData.map((data, idx) => {
          const battingTeam = getTeamForInnings(data.battingTeamId);
          return (
            <TabsTrigger key={idx} value={idx.toString()}>
              {battingTeam?.short_name || battingTeam?.name || `Innings ${idx + 1}`}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {inningsData.map((data, idx) => {
        const battingTeam = getTeamForInnings(data.battingTeamId);
        
        return (
          <TabsContent key={idx} value={idx.toString()} className="space-y-4">
            {/* Team Score */}
            <div className="text-center py-3 bg-primary/10 rounded-xl">
              <h3 className="font-bold text-lg">{battingTeam?.name || 'Team'}</h3>
              <div className="text-3xl font-black text-primary">
                {data.totalRuns}/{data.totalWickets}
              </div>
              <p className="text-sm text-muted-foreground">
                ({data.totalOversCompleted.toFixed(1)} overs)
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
                {data.batsmanStats.map((stat) => (
                  <div key={stat.playerId} className="grid grid-cols-12 gap-1 px-3 py-2 border-t border-border text-sm">
                    <div className="col-span-5 truncate">
                      <span className={stat.isOut ? 'text-muted-foreground' : 'font-medium'}>
                        {stat.playerName}
                      </span>
                      {stat.isOut && <span className="text-xs text-destructive ml-1">out</span>}
                    </div>
                    <div className="col-span-2 text-center font-bold">{stat.runsScored}</div>
                    <div className="col-span-2 text-center text-muted-foreground">{stat.ballsFaced}</div>
                    <div className="col-span-1 text-center text-cricket-four">{stat.fours}</div>
                    <div className="col-span-1 text-center text-cricket-six">{stat.sixes}</div>
                    <div className="col-span-1 text-center text-muted-foreground text-xs">
                      {stat.ballsFaced > 0 
                        ? ((stat.runsScored / stat.ballsFaced) * 100).toFixed(0)
                        : '-'
                      }
                    </div>
                  </div>
                ))}
                {data.batsmanStats.length === 0 && (
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
                {data.bowlerStats.map((stat) => (
                  <div key={stat.playerId} className="grid grid-cols-12 gap-1 px-3 py-2 border-t border-border text-sm">
                    <div className="col-span-5 truncate font-medium">{stat.playerName}</div>
                    <div className="col-span-2 text-center">{stat.oversBowled}</div>
                    <div className="col-span-2 text-center">{stat.runsConceded}</div>
                    <div className="col-span-2 text-center font-bold text-cricket-wicket">{stat.wicketsTaken}</div>
                    <div className="col-span-1 text-center text-muted-foreground text-xs">
                      {stat.oversBowled > 0 
                        ? (stat.runsConceded / stat.oversBowled).toFixed(1)
                        : '-'
                      }
                    </div>
                  </div>
                ))}
                {data.bowlerStats.length === 0 && (
                  <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                    No bowling data
                  </div>
                )}
              </div>
            </div>

            {/* Extras */}
            <div className="text-sm text-muted-foreground px-1">
              Extras: {data.totalExtras}
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
