import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Team, Player } from '@/types/cricket';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';

export function MatchSetup() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [team1Id, setTeam1Id] = useState<string>('');
  const [team2Id, setTeam2Id] = useState<string>('');
  const [totalOvers, setTotalOvers] = useState<string>('10');
  const [battingTeamId, setBattingTeamId] = useState<string>('');
  const [openingBatsmanId, setOpeningBatsmanId] = useState<string>('');
  const [openingBowlerId, setOpeningBowlerId] = useState<string>('');

  useEffect(() => {
    loadTeamsAndPlayers();
  }, []);

  const loadTeamsAndPlayers = async () => {
    const [teamsRes, playersRes] = await Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('players').select('*').order('name')
    ]);

    if (teamsRes.data) setTeams(teamsRes.data);
    if (playersRes.data) setPlayers(playersRes.data);
    setLoading(false);
  };

  const battingTeamPlayers = players.filter(p => p.team_id === battingTeamId);
  const bowlingTeamId = battingTeamId === team1Id ? team2Id : team1Id;
  const bowlingTeamPlayers = players.filter(p => p.team_id === bowlingTeamId);

  const canProceedStep1 = team1Id && team2Id && team1Id !== team2Id && totalOvers;
  const canProceedStep2 = battingTeamId;
  const canProceedStep3 = openingBatsmanId;
  const canStart = openingBowlerId;

  const startMatch = async () => {
    if (!canStart) return;
    
    setCreating(true);
    try {
      // Create match
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          team1_id: team1Id,
          team2_id: team2Id,
          total_overs: parseInt(totalOvers),
          status: 'in_progress'
        })
        .select()
        .single();

      if (matchError) throw matchError;

      // Create first innings
      const { data: innings, error: inningsError } = await supabase
        .from('innings')
        .insert({
          match_id: match.id,
          innings_number: 1,
          batting_team_id: battingTeamId,
          bowling_team_id: bowlingTeamId,
          total_runs: 0,
          total_wickets: 0,
          total_overs_completed: 0,
          total_extras: 0,
          is_completed: false
        })
        .select()
        .single();

      if (inningsError) throw inningsError;

      // Create first over
      const { error: overError } = await supabase
        .from('overs')
        .insert({
          innings_id: innings.id,
          over_number: 1,
          bowler_id: openingBowlerId,
          runs_conceded: 0,
          wickets_taken: 0,
          is_completed: false
        });

      if (overError) throw overError;

      // Create batsman stats
      const { error: batsmanError } = await supabase
        .from('batsman_innings_stats')
        .insert({
          innings_id: innings.id,
          batsman_id: openingBatsmanId,
          runs_scored: 0,
          balls_faced: 0,
          fours: 0,
          sixes: 0,
          is_out: false,
          batting_order: 1
        });

      if (batsmanError) throw batsmanError;

      // Create bowler stats
      const { error: bowlerError } = await supabase
        .from('bowler_innings_stats')
        .insert({
          innings_id: innings.id,
          bowler_id: openingBowlerId,
          overs_bowled: 0,
          runs_conceded: 0,
          wickets_taken: 0,
          wides: 0,
          no_balls: 0
        });

      if (bowlerError) throw bowlerError;

      // Log match event
      await supabase.from('match_events').insert({
        match_id: match.id,
        innings_id: innings.id,
        event_type: 'match_started',
        event_data: { team1_id: team1Id, team2_id: team2Id, overs: parseInt(totalOvers) }
      });

      toast.success('Match started!');
      navigate(`/match/${match.id}`);

    } catch (error) {
      console.error('Error creating match:', error);
      toast.error('Failed to start match');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <MainLayout hideNav>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout hideNav>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 p-4 max-w-md mx-auto">
          <button onClick={() => navigate('/')} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">New Match</h1>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-6">
        {/* Step 1: Select Teams */}
        <div className="card-score space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">1</span>
            <h2 className="font-bold">Select Teams</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Team 1</label>
              <Select value={team1Id} onValueChange={setTeam1Id}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Team 2</label>
              <Select value={team2Id} onValueChange={setTeam2Id}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.filter(t => t.id !== team1Id).map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Overs</label>
              <Select value={totalOvers} onValueChange={setTotalOvers}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 25, 30, 40, 50].map(o => (
                    <SelectItem key={o} value={o.toString()}>{o} overs</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Step 2: Batting Team */}
        {canProceedStep1 && (
          <div className="card-score space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">2</span>
              <h2 className="font-bold">Who's Batting First?</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[team1Id, team2Id].map(id => {
                const team = teams.find(t => t.id === id);
                return (
                  <button
                    key={id}
                    onClick={() => setBattingTeamId(id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      battingTeamId === id 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="font-medium">{team?.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Opening Batsman */}
        {canProceedStep2 && (
          <div className="card-score space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">3</span>
              <h2 className="font-bold">Opening Batsman</h2>
            </div>

            <Select value={openingBatsmanId} onValueChange={setOpeningBatsmanId}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select batsman" />
              </SelectTrigger>
              <SelectContent>
                {battingTeamPlayers.map(player => (
                  <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Step 4: Opening Bowler */}
        {canProceedStep3 && (
          <div className="card-score space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">4</span>
              <h2 className="font-bold">Opening Bowler</h2>
            </div>

            <Select value={openingBowlerId} onValueChange={setOpeningBowlerId}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select bowler" />
              </SelectTrigger>
              <SelectContent>
                {bowlingTeamPlayers.map(player => (
                  <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Start Button */}
        {canStart && (
          <Button 
            onClick={startMatch}
            disabled={creating}
            className="w-full h-14 text-lg font-bold animate-fade-in"
          >
            {creating ? 'Starting...' : 'Start Match'}
          </Button>
        )}
      </main>
    </MainLayout>
  );
}
