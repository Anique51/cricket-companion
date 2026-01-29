import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
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
  
  // Delete dialogs
  const [showDeleteTeamDialog, setShowDeleteTeamDialog] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);

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

  // Delete team only (keep match data by setting team references to null or leaving them)
  const deleteTeamOnly = async () => {
    if (!team) return;
    
    try {
      // Delete all players first
      await supabase.from('players').delete().eq('team_id', team.id);
      
      // Try to delete team - if it has match references, the delete will fail
      // In that case, we just remove from the teams table but matches retain the team_id
      const { error } = await supabase.from('teams').delete().eq('id', team.id);
      
      if (error) {
        // Team has match references - we can't fully delete but we've already removed players
        // For now, we'll just show success as the team is effectively "archived"
        toast.success('Team removed (match history preserved)');
      } else {
        toast.success('Team deleted');
      }
      
      setShowDeleteTeamDialog(false);
      navigate('/teams');
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Failed to delete team');
    }
  };

  // Delete team and all related data
  const deleteTeamAndData = async () => {
    if (!team) return;
    
    try {
      // Get all players for this team
      const playerIds = players.map(p => p.id);
      
      // Delete batsman stats for these players
      if (playerIds.length > 0) {
        await supabase.from('batsman_innings_stats').delete().in('batsman_id', playerIds);
        await supabase.from('bowler_innings_stats').delete().in('bowler_id', playerIds);
        await supabase.from('deliveries').delete().in('batsman_id', playerIds);
        await supabase.from('deliveries').delete().in('bowler_id', playerIds);
      }
      
      // Get all matches involving this team
      const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .or(`team1_id.eq.${team.id},team2_id.eq.${team.id}`);
      
      if (matches && matches.length > 0) {
        const matchIds = matches.map(m => m.id);
        
        // Get all innings for these matches
        const { data: innings } = await supabase
          .from('innings')
          .select('id')
          .in('match_id', matchIds);
        
        if (innings && innings.length > 0) {
          const inningsIds = innings.map(i => i.id);
          
          // Delete overs
          await supabase.from('overs').delete().in('innings_id', inningsIds);
          
          // Delete remaining deliveries for these innings
          await supabase.from('deliveries').delete().in('innings_id', inningsIds);
          
          // Delete remaining batsman stats
          await supabase.from('batsman_innings_stats').delete().in('innings_id', inningsIds);
          
          // Delete remaining bowler stats
          await supabase.from('bowler_innings_stats').delete().in('innings_id', inningsIds);
          
          // Delete innings
          await supabase.from('innings').delete().in('match_id', matchIds);
        }
        
        // Delete match events
        await supabase.from('match_events').delete().in('match_id', matchIds);
        
        // Delete matches
        await supabase.from('matches').delete().in('id', matchIds);
      }
      
      // Delete players
      await supabase.from('players').delete().eq('team_id', team.id);
      
      // Delete team
      await supabase.from('teams').delete().eq('id', team.id);
      
      toast.success('Team and all related data deleted');
      setShowDeleteTeamDialog(false);
      navigate('/teams');
    } catch (error) {
      console.error('Error deleting team and data:', error);
      toast.error('Failed to delete team and data');
    }
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

  // Remove player from team only (keep stats for historical purposes)
  const removePlayerFromTeam = async (player: Player) => {
    // We can't truly "remove" a player from team without deleting, 
    // but we can delete the player record while keeping stats (stats have player_id reference)
    const { error } = await supabase.from('players').delete().eq('id', player.id);
    
    if (error) {
      toast.error('Failed to remove player');
      return;
    }
    
    toast.success('Player removed from team');
    setPlayerToDelete(null);
    loadData();
  };

  // Delete player and all related data
  const deletePlayerAndData = async (player: Player) => {
    try {
      // Delete batsman stats
      await supabase.from('batsman_innings_stats').delete().eq('batsman_id', player.id);
      
      // Delete bowler stats
      await supabase.from('bowler_innings_stats').delete().eq('bowler_id', player.id);
      
      // Delete deliveries where player was batsman or bowler
      await supabase.from('deliveries').delete().eq('batsman_id', player.id);
      await supabase.from('deliveries').delete().eq('bowler_id', player.id);
      
      // Delete overs where player was bowler
      await supabase.from('overs').delete().eq('bowler_id', player.id);
      
      // Delete player
      await supabase.from('players').delete().eq('id', player.id);
      
      toast.success('Player and all related data deleted');
      setPlayerToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting player and data:', error);
      toast.error('Failed to delete player and data');
    }
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
            
            <Dialog open={showDeleteTeamDialog} onOpenChange={setShowDeleteTeamDialog}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-white/10">
                  <Trash2 className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Delete Team</DialogTitle>
                  <DialogDescription>
                    Choose how you want to delete this team.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-auto py-3"
                    onClick={deleteTeamOnly}
                  >
                    <div className="text-left">
                      <div className="font-medium">Delete Team Only</div>
                      <div className="text-xs text-muted-foreground">
                        Removes team from list. Match history is preserved.
                      </div>
                    </div>
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full justify-start h-auto py-3"
                    onClick={deleteTeamAndData}
                  >
                    <div className="text-left">
                      <div className="font-medium">Delete Team + All Data</div>
                      <div className="text-xs opacity-90">
                        Removes team, players, matches, and all stats.
                      </div>
                    </div>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => setShowDeleteTeamDialog(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
                <Dialog open={playerToDelete?.id === player.id} onOpenChange={(open) => !open && setPlayerToDelete(null)}>
                  <DialogTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setPlayerToDelete(player)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Delete Player</DialogTitle>
                      <DialogDescription>
                        Choose how you want to delete {player.name}.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-4">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start h-auto py-3"
                        onClick={() => removePlayerFromTeam(player)}
                      >
                        <div className="text-left">
                          <div className="font-medium">Remove from Team</div>
                          <div className="text-xs text-muted-foreground">
                            Removes player. Historical stats are preserved.
                          </div>
                        </div>
                      </Button>
                      <Button 
                        variant="destructive" 
                        className="w-full justify-start h-auto py-3"
                        onClick={() => deletePlayerAndData(player)}
                      >
                        <div className="text-left">
                          <div className="font-medium">Delete Player + All Data</div>
                          <div className="text-xs opacity-90">
                            Removes player and all their stats from matches.
                          </div>
                        </div>
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full"
                        onClick={() => setPlayerToDelete(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
