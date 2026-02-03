import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { Team, Player } from '@/types/cricket';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';
import {
  initDB,
  generateId,
  saveMatch,
  saveInnings,
  savePlayers,
  saveBatsmanState,
  saveBowlerState,
  type LocalMatch,
  type LocalInnings,
  type LocalPlayer,
  type LocalBatsmanState,
  type LocalBowlerState,
} from '@/lib/localDb';

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
    initDB().then(() => loadTeamsAndPlayers());
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
      // Generate local match ID
      const matchId = generateId();
      
      // Get team info for local storage
      const team1 = teams.find(t => t.id === team1Id);
      const team2 = teams.find(t => t.id === team2Id);
      
      if (!team1 || !team2) throw new Error('Teams not found');

      // 1. Save match to local IndexedDB
      const localMatch: LocalMatch = {
        id: matchId,
        team1Id: team1Id,
        team2Id: team2Id,
        team1Name: team1.name,
        team2Name: team2.name,
        team1ShortName: team1.short_name || team1.name.substring(0, 3).toUpperCase(),
        team2ShortName: team2.short_name || team2.name.substring(0, 3).toUpperCase(),
        totalOvers: parseInt(totalOvers),
        status: 'LIVE',
        winnerId: null,
        resultDescription: null,
        createdAt: Date.now(),
        completedAt: null,
        syncedAt: null,
      };
      await saveMatch(localMatch);

      // 2. Save first innings to local
      const localInnings: LocalInnings = {
        matchId: matchId,
        inningsNumber: 1,
        battingTeamId: battingTeamId,
        bowlingTeamId: bowlingTeamId,
        isCompleted: false,
      };
      await saveInnings(localInnings);

      // 3. Cache ALL players from both teams to local DB
      const allMatchPlayers: LocalPlayer[] = players
        .filter(p => p.team_id === team1Id || p.team_id === team2Id)
        .map(p => ({
          id: p.id,
          name: p.name,
          teamId: p.team_id,
        }));
      await savePlayers(allMatchPlayers);

      // 4. Save opening batsman state
      const batsmanState: LocalBatsmanState = {
        playerId: openingBatsmanId,
        inningsNumber: 1,
        matchId: matchId,
        battingOrder: 1,
        isOut: false,
      };
      await saveBatsmanState(batsmanState);

      // 5. Save opening bowler state
      const bowlerState: LocalBowlerState = {
        playerId: openingBowlerId,
        inningsNumber: 1,
        matchId: matchId,
        overNumbers: [1],
      };
      await saveBowlerState(bowlerState);

      toast.success('Match started!');
      navigate(`/match/${matchId}`);

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
              <Input
                type="number"
                min="1"
                max="50"
                value={totalOvers}
                onChange={(e) => setTotalOvers(e.target.value)}
                placeholder="Enter number of overs"
                className="h-12"
              />
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
