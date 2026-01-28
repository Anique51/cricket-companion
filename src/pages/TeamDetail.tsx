import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { Team, Player } from '@/types/cricket';
import { toast } from 'sonner';
import { ChevronLeft, Plus, Trash2, Edit, User } from 'lucide-react';

export default function TeamDetail() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit team
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamShortName, setEditTeamShortName] = useState('');
  
  // Add player
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  
  // Edit player
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');

  useEffect(() => {
    if (teamId) loadData();
  }, [teamId]);

  const loadData = async () => {
    const [teamRes, playersRes] = await Promise.all([
      supabase.from('teams').select('*').eq('id', teamId).single(),
      supabase.from('players').select('*').eq('team_id', teamId).order('name')
    ]);

    if (teamRes.data) {
      setTeam(teamRes.data);
      setEditTeamName(teamRes.data.name);
      setEditTeamShortName(teamRes.data.short_name || '');
    }
    if (playersRes.data) setPlayers(playersRes.data);
    setLoading(false);
  };

  const updateTeam = async () => {
    if (!team || !editTeamName.trim()) return;
    
    const { error } = await supabase
      .from('teams')
      .update({ 
        name: editTeamName.trim(), 
        short_name: editTeamShortName.trim() || null 
      })
      .eq('id', team.id);
    
    if (error) {
      toast.error('Failed to update team');
      return;
    }
    
    toast.success('Team updated!');
    setShowEditTeam(false);
    loadData();
  };

  const deleteTeam = async () => {
    if (!team) return;
    
    // First delete all players
    await supabase.from('players').delete().eq('team_id', team.id);
    
    const { error } = await supabase.from('teams').delete().eq('id', team.id);
    
    if (error) {
      toast.error('Failed to delete team. It may have match history.');
      return;
    }
    
    toast.success('Team deleted');
    navigate('/teams');
  };

  const addPlayer = async () => {
    if (!team || !newPlayerName.trim()) return;
    
    const { error } = await supabase
      .from('players')
      .insert({ name: newPlayerName.trim(), team_id: team.id });
    
    if (error) {
      toast.error('Failed to add player');
      return;
    }
    
    toast.success('Player added!');
    setNewPlayerName('');
    setShowAddPlayer(false);
    loadData();
  };

  const updatePlayer = async () => {
    if (!editingPlayer || !editPlayerName.trim()) return;
    
    const { error } = await supabase
      .from('players')
      .update({ name: editPlayerName.trim() })
      .eq('id', editingPlayer.id);
    
    if (error) {
      toast.error('Failed to update player');
      return;
    }
    
    toast.success('Player updated!');
    setEditingPlayer(null);
    setEditPlayerName('');
    loadData();
  };

  const deletePlayer = async (playerId: string) => {
    // Check if player has stats
    const { data: batsmanStats } = await supabase
      .from('batsman_innings_stats')
      .select('id')
      .eq('batsman_id', playerId)
      .limit(1);
    
    const { data: bowlerStats } = await supabase
      .from('bowler_innings_stats')
      .select('id')
      .eq('bowler_id', playerId)
      .limit(1);
    
    if ((batsmanStats && batsmanStats.length > 0) || (bowlerStats && bowlerStats.length > 0)) {
      toast.error('Cannot delete player with match history');
      return;
    }
    
    const { error } = await supabase.from('players').delete().eq('id', playerId);
    
    if (error) {
      toast.error('Failed to delete player');
      return;
    }
    
    toast.success('Player deleted');
    loadData();
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  if (!team) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Team not found</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <header className="sticky top-0 z-10 bg-field-gradient text-primary-foreground">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/teams')} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold">{team.name}</h1>
              {team.short_name && <p className="text-xs opacity-80">{team.short_name}</p>}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={showEditTeam} onOpenChange={setShowEditTeam}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-white/10">
                  <Edit className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Edit Team</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Team Name</label>
                    <Input 
                      value={editTeamName}
                      onChange={(e) => setEditTeamName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Short Name</label>
                    <Input 
                      value={editTeamShortName}
                      onChange={(e) => setEditTeamShortName(e.target.value)}
                      maxLength={4}
                    />
                  </div>
                  <Button onClick={updateTeam} className="w-full">Save Changes</Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-white/10">
                  <Trash2 className="w-5 h-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Team?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete the team and all its players. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteTeam} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* Stats */}
        <div className="card-score text-center">
          <span className="text-4xl font-black text-primary">{players.length}</span>
          <p className="text-sm text-muted-foreground">Players</p>
        </div>

        {/* Players */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Squad</h2>
          <Dialog open={showAddPlayer} onOpenChange={setShowAddPlayer}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" /> Add Player
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Add Player</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input 
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Player name"
                />
                <Button onClick={addPlayer} className="w-full">Add Player</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {players.map(player => (
            <div key={player.id} className="card-player flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium">{player.name}</span>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditingPlayer(player);
                    setEditPlayerName(player.name);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Player?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove {player.name} from the team.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deletePlayer(player.id)} 
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}

          {players.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No players yet. Add your first player!</p>
          )}
        </div>
      </main>

      {/* Edit Player Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={(open) => !open && setEditingPlayer(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input 
              value={editPlayerName}
              onChange={(e) => setEditPlayerName(e.target.value)}
            />
            <Button onClick={updatePlayer} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
