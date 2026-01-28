import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Team, Player } from '@/types/cricket';
import { toast } from 'sonner';
import { Plus, Users, ChevronRight } from 'lucide-react';

export default function TeamsPlayers() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New team form
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamShortName, setNewTeamShortName] = useState('');

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

  const getPlayerCount = (teamId: string) => {
    return players.filter(p => p.team_id === teamId).length;
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

  return (
    <MainLayout>
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <h1 className="text-xl font-bold">Teams & Players</h1>
          <Dialog open={showNewTeam} onOpenChange={setShowNewTeam}>
            <DialogTrigger asChild>
              <Button size="sm">
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
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-3">
        {teams.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No teams yet</p>
            <p className="text-sm text-muted-foreground">Create your first team to get started</p>
          </div>
        ) : (
          teams.map(team => (
            <button
              key={team.id}
              onClick={() => navigate(`/team/${team.id}`)}
              className="card-score w-full text-left hover:border-primary transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{team.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {team.short_name && <span className="bg-muted px-2 py-0.5 rounded text-xs">{team.short_name}</span>}
                    <span>{getPlayerCount(team.id)} players</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))
        )}
      </main>
    </MainLayout>
  );
}
