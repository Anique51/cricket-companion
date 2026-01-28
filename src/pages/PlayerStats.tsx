import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Team, Player } from '@/types/cricket';
import { Search, User } from 'lucide-react';

interface PlayerStatsData {
  player: Player;
  teamName: string;
  runs: number;
  wickets: number;
  fours: number;
  sixes: number;
  matches: number;
}

export default function PlayerStats() {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStatsData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [teamsRes, playersRes, batsmanStatsRes, bowlerStatsRes] = await Promise.all([
        supabase.from('teams').select('*'),
        supabase.from('players').select('*'),
        supabase.from('batsman_innings_stats').select('batsman_id, runs_scored, fours, sixes, innings_id'),
        supabase.from('bowler_innings_stats').select('bowler_id, wickets_taken')
      ]);

      if (teamsRes.data) setTeams(teamsRes.data);

      if (playersRes.data && teamsRes.data && batsmanStatsRes.data && bowlerStatsRes.data) {
        // Aggregate batting stats
        const battingMap = new Map<string, { runs: number; fours: number; sixes: number; innings: Set<string> }>();
        batsmanStatsRes.data.forEach(stat => {
          const existing = battingMap.get(stat.batsman_id) || { runs: 0, fours: 0, sixes: 0, innings: new Set() };
          existing.runs += stat.runs_scored;
          existing.fours += stat.fours;
          existing.sixes += stat.sixes;
          existing.innings.add(stat.innings_id);
          battingMap.set(stat.batsman_id, existing);
        });

        // Aggregate bowling stats
        const bowlingMap = new Map<string, number>();
        bowlerStatsRes.data.forEach(stat => {
          bowlingMap.set(stat.bowler_id, (bowlingMap.get(stat.bowler_id) || 0) + stat.wickets_taken);
        });

        // Build player stats
        const stats: PlayerStatsData[] = playersRes.data.map(player => {
          const batting = battingMap.get(player.id) || { runs: 0, fours: 0, sixes: 0, innings: new Set() };
          const wickets = bowlingMap.get(player.id) || 0;
          const team = teamsRes.data.find(t => t.id === player.team_id);
          return {
            player,
            teamName: team?.name || 'Unknown',
            runs: batting.runs,
            wickets,
            fours: batting.fours,
            sixes: batting.sixes,
            matches: batting.innings.size
          };
        });

        setPlayerStats(stats);
      }
    } catch (error) {
      console.error('Error loading player stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStats = playerStats.filter(stat => {
    const matchesSearch = stat.player.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = selectedTeamId === 'all' || stat.player.team_id === selectedTeamId;
    return matchesSearch && matchesTeam;
  });

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading player stats...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border">
        <div className="p-4 max-w-lg mx-auto">
          <h1 className="text-xl font-bold">Player Stats</h1>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search player..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id}>{team.short_name || team.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Player Cards */}
        <div className="space-y-3">
          {filteredStats.map(stat => (
            <div key={stat.player.id} className="card-score">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{stat.player.name}</h3>
                  <span className="text-sm text-muted-foreground">{stat.teamName}</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-xl font-black text-foreground">{stat.runs}</span>
                  <span className="text-xs text-muted-foreground block">Runs</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-xl font-black text-cricket-wicket">{stat.wickets}</span>
                  <span className="text-xs text-muted-foreground block">Wickets</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-xl font-black text-cricket-four">{stat.fours}</span>
                  <span className="text-xs text-muted-foreground block">Fours</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-xl font-black text-cricket-six">{stat.sixes}</span>
                  <span className="text-xs text-muted-foreground block">Sixes</span>
                </div>
              </div>

              <div className="text-center text-xs text-muted-foreground mt-3">
                {stat.matches} innings played
              </div>
            </div>
          ))}

          {filteredStats.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No players found</p>
          )}
        </div>
      </main>
    </MainLayout>
  );
}
