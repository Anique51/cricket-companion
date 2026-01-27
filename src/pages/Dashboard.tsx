import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Team, Match, Player } from '@/types/cricket';
import { ChevronLeft, Trophy, Target, Zap, CircleDot } from 'lucide-react';

interface TeamStatsData {
  team: Team;
  wins: number;
  matches: number;
}

interface PlayerStatsData {
  player: Player;
  teamName: string;
  runs: number;
  wickets: number;
  fours: number;
  sixes: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teamStats, setTeamStats] = useState<TeamStatsData[]>([]);
  const [topRunScorers, setTopRunScorers] = useState<PlayerStatsData[]>([]);
  const [topWicketTakers, setTopWicketTakers] = useState<PlayerStatsData[]>([]);
  const [topFourHitters, setTopFourHitters] = useState<PlayerStatsData[]>([]);
  const [topSixHitters, setTopSixHitters] = useState<PlayerStatsData[]>([]);
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load teams
      const { data: teams } = await supabase.from('teams').select('*');
      
      // Load completed matches
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'completed');
      
      setMatchCount(matches?.length || 0);

      // Calculate team stats
      if (teams && matches) {
        const stats: TeamStatsData[] = teams.map(team => {
          const wins = matches.filter(m => m.winner_team_id === team.id).length;
          const played = matches.filter(m => m.team1_id === team.id || m.team2_id === team.id).length;
          return { team, wins, matches: played };
        });
        setTeamStats(stats.sort((a, b) => b.wins - a.wins));
      }

      // Load players
      const { data: players } = await supabase.from('players').select('*');
      
      // Load batsman stats aggregated
      const { data: batsmanStats } = await supabase
        .from('batsman_innings_stats')
        .select('batsman_id, runs_scored, fours, sixes');
      
      // Load bowler stats aggregated
      const { data: bowlerStats } = await supabase
        .from('bowler_innings_stats')
        .select('bowler_id, wickets_taken');

      if (players && teams && batsmanStats && bowlerStats) {
        // Aggregate player batting stats
        const playerBattingMap = new Map<string, { runs: number; fours: number; sixes: number }>();
        batsmanStats.forEach(stat => {
          const existing = playerBattingMap.get(stat.batsman_id) || { runs: 0, fours: 0, sixes: 0 };
          playerBattingMap.set(stat.batsman_id, {
            runs: existing.runs + stat.runs_scored,
            fours: existing.fours + stat.fours,
            sixes: existing.sixes + stat.sixes
          });
        });

        // Aggregate player bowling stats
        const playerBowlingMap = new Map<string, number>();
        bowlerStats.forEach(stat => {
          const existing = playerBowlingMap.get(stat.bowler_id) || 0;
          playerBowlingMap.set(stat.bowler_id, existing + stat.wickets_taken);
        });

        // Build player stats
        const allPlayerStats: PlayerStatsData[] = players.map(player => {
          const batting = playerBattingMap.get(player.id) || { runs: 0, fours: 0, sixes: 0 };
          const wickets = playerBowlingMap.get(player.id) || 0;
          const team = teams.find(t => t.id === player.team_id);
          return {
            player,
            teamName: team?.name || 'Unknown',
            runs: batting.runs,
            wickets,
            fours: batting.fours,
            sixes: batting.sixes
          };
        });

        // Sort and get top 5 for each category
        setTopRunScorers([...allPlayerStats].sort((a, b) => b.runs - a.runs).slice(0, 5));
        setTopWicketTakers([...allPlayerStats].sort((a, b) => b.wickets - a.wickets).slice(0, 5));
        setTopFourHitters([...allPlayerStats].sort((a, b) => b.fours - a.fours).slice(0, 5));
        setTopSixHitters([...allPlayerStats].sort((a, b) => b.sixes - a.sixes).slice(0, 5));
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-field-gradient text-primary-foreground">
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-xs opacity-80">{matchCount} matches completed</p>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-6">
        {/* Team Standings */}
        <section>
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent" />
            Team Standings
          </h2>
          <div className="space-y-2">
            {teamStats.map((stat, index) => (
              <div key={stat.team.id} className="card-player flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <span className="font-medium">{stat.team.name}</span>
                    <span className="text-xs text-muted-foreground block">{stat.matches} matches</span>
                  </div>
                </div>
                <span className="text-xl font-bold text-primary">{stat.wins} W</span>
              </div>
            ))}
          </div>
        </section>

        {/* Top Run Scorers */}
        <section>
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Top Run Scorers
          </h2>
          <div className="space-y-2">
            {topRunScorers.map((stat, index) => (
              <div key={stat.player.id} className="card-player flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-sm font-bold text-muted-foreground">{index + 1}</span>
                  <div>
                    <span className="font-medium">{stat.player.name}</span>
                    <span className="text-xs text-muted-foreground block">{stat.teamName}</span>
                  </div>
                </div>
                <span className="text-lg font-bold">{stat.runs}</span>
              </div>
            ))}
            {topRunScorers.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No data yet</p>
            )}
          </div>
        </section>

        {/* Top Wicket Takers */}
        <section>
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-cricket-wicket" />
            Top Wicket Takers
          </h2>
          <div className="space-y-2">
            {topWicketTakers.filter(s => s.wickets > 0).map((stat, index) => (
              <div key={stat.player.id} className="card-player flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-sm font-bold text-muted-foreground">{index + 1}</span>
                  <div>
                    <span className="font-medium">{stat.player.name}</span>
                    <span className="text-xs text-muted-foreground block">{stat.teamName}</span>
                  </div>
                </div>
                <span className="text-lg font-bold text-cricket-wicket">{stat.wickets}</span>
              </div>
            ))}
            {topWicketTakers.filter(s => s.wickets > 0).length === 0 && (
              <p className="text-center text-muted-foreground py-4">No data yet</p>
            )}
          </div>
        </section>

        {/* Top Boundary Hitters */}
        <div className="grid grid-cols-2 gap-4">
          <section>
            <h2 className="font-bold text-sm mb-2 flex items-center gap-1">
              <CircleDot className="w-4 h-4 text-cricket-four" />
              Most Fours
            </h2>
            <div className="space-y-1">
              {topFourHitters.filter(s => s.fours > 0).slice(0, 3).map((stat, index) => (
                <div key={stat.player.id} className="card-player p-2 flex items-center justify-between">
                  <span className="text-sm truncate">{stat.player.name}</span>
                  <span className="font-bold text-cricket-four">{stat.fours}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-bold text-sm mb-2 flex items-center gap-1">
              <CircleDot className="w-4 h-4 text-cricket-six" />
              Most Sixes
            </h2>
            <div className="space-y-1">
              {topSixHitters.filter(s => s.sixes > 0).slice(0, 3).map((stat, index) => (
                <div key={stat.player.id} className="card-player p-2 flex items-center justify-between">
                  <span className="text-sm truncate">{stat.player.name}</span>
                  <span className="font-bold text-cricket-six">{stat.sixes}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}