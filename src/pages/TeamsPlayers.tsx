import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Team, Player } from '@/types/cricket';
import { toast } from 'sonner';
import { ChevronLeft, Plus, Users, Trash2 } from 'lucide-react';

export default function TeamsPlayers() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  
  // New team form
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamShortName, setNewTeamShortName] = useState('');
  
  // New player form
  const [showNewPlayer, setShowNewPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerTeamId, setNewPlayerTeamId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [teamsRes, playersRes] = await Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('players').select('*').order('name')
    ]);

    if (teamsRes.data) setTeams(teamsRes.data);
    if (playersRes.data) setPlayers(playersRes.data);
    setLoading(false);
  };

  const filteredPlayers = selectedTeamId === 'all' 
    ? players 
    : players.filter(p => p.team_id === selectedTeamId);

  const addTeam = async () => {
    if (!newTeamName.trim()) return;
    
    const { error } = await supabase
      .from('teams')
      .insert({ name: newTeamName.trim(), short_name: newTeamShortName.trim() || null });
    
    if (error) {
      toast.error('Failed to add team');
      return;
    }
    
    toast.success('Team added!');
    setNewTeamName('');
    setNewTeamShortName('');
    setShowNewTeam(false);
    loadData();
  };

  const addPlayer = async () => {
    if (!newPlayerName.trim() || !newPlayerTeamId) return;
    
    const { error } = await supabase
      .from('players')
      .insert({ name: newPlayerName.trim(), team_id: newPlayerTeamId });
    
    if (error) {
      toast.error('Failed to add player');
      return;
    }
    
    toast.success('Player added!');
    setNewPlayerName('');
    setNewPlayerTeamId('');
    setShowNewPlayer(false);
    loadData();
  };

  const deletePlayer = async (playerId: string) => {
    const { error } = await supabase.from('players').delete().eq('id', playerId);
    
    if (error) {
      toast.error('Failed to delete player');
      return;
    }
    
    toast.success('Player deleted');
    loadData();
  };

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 -ml-2">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Teams & Players</h1>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-6">
        {/* Teams Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">Teams</h2>
            <Dialog open={showNewTeam} onOpenChange={setShowNewTeam}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" /> Add Team
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Add New Team</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Team Name</label>
                    <Input 
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="e.g., Thunder Kings"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Short Name (optional)</label>
                    <Input 
                      value={newTeamShortName}
                      onChange={(e) => setNewTeamShortName(e.target.value)}
                      placeholder="e.g., TK"
                      maxLength={4}
                    />
                  </div>
                  <Button onClick={addTeam} className="w-full">Add Team</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {teams.map(team => (
              <div key={team.id} className="card-player">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{team.name}</span>
                </div>
                {team.short_name && (
                  <span className="text-xs text-muted-foreground mt-1 block">{team.short_name}</span>
                )}
                <span className="text-xs text-muted-foreground">
                  {players.filter(p => p.team_id === team.id).length} players
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Players Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">Players</h2>
            <Dialog open={showNewPlayer} onOpenChange={setShowNewPlayer}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" /> Add Player
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Add New Player</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Player Name</label>
                    <Input 
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      placeholder="e.g., John Smith"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Team</label>
                    <Select value={newPlayerTeamId} onValueChange={setNewPlayerTeamId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addPlayer} className="w-full">Add Player</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filter */}
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="mb-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Player List */}
          <div className="space-y-2">
            {filteredPlayers.map(player => (
              <div key={player.id} className="card-player flex items-center justify-between">
                <div>
                  <span className="font-medium">{player.name}</span>
                  <span className="text-xs text-muted-foreground block">{getTeamName(player.team_id)}</span>
                </div>
                <button 
                  onClick={() => deletePlayer(player.id)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {filteredPlayers.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No players found</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}