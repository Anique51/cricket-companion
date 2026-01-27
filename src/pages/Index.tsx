import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import type { Match, Team } from '@/types/cricket';
import { Plus, BarChart3, Users, Trophy, Clock } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  const [recentMatches, setRecentMatches] = useState<(Match & { team1?: Team; team2?: Team })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentMatches();
  }, []);

  const loadRecentMatches = async () => {
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (matches) {
      const withTeams = await Promise.all(matches.map(async (match) => {
        const [t1, t2] = await Promise.all([
          supabase.from('teams').select('*').eq('id', match.team1_id).single(),
          supabase.from('teams').select('*').eq('id', match.team2_id).single()
        ]);
        return { ...match, team1: t1.data || undefined, team2: t2.data || undefined };
      }));
      setRecentMatches(withTeams);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Hero Header */}
      <header className="bg-field-gradient text-primary-foreground p-6 pb-8">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-black mb-1">Cricket Scorer</h1>
          <p className="text-sm opacity-80">Professional scoring for your tournaments</p>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto -mt-4">
        {/* Quick Actions */}
        <div className="card-score mb-6">
          <Button onClick={() => navigate('/new-match')} className="w-full h-14 text-lg font-bold mb-3">
            <Plus className="w-5 h-5 mr-2" /> New Match
          </Button>
          
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="h-12 flex-col gap-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs">Dashboard</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/teams')} className="h-12 flex-col gap-1">
              <Users className="w-4 h-4" />
              <span className="text-xs">Teams</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/stats')} className="h-12 flex-col gap-1">
              <Trophy className="w-4 h-4" />
              <span className="text-xs">Stats</span>
            </Button>
          </div>
        </div>

        {/* Recent Matches */}
        <section>
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Recent Matches
          </h2>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : recentMatches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No matches yet</p>
              <p className="text-sm">Start your first match!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentMatches.map(match => (
                <button
                  key={match.id}
                  onClick={() => navigate(`/match/${match.id}`)}
                  className="card-player w-full text-left hover:border-primary transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">
                        {match.team1?.short_name || match.team1?.name} vs {match.team2?.short_name || match.team2?.name}
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        {match.total_overs} overs • {new Date(match.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      match.status === 'completed' ? 'bg-primary/10 text-primary' :
                      match.status === 'in_progress' ? 'bg-accent/10 text-accent' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {match.status === 'in_progress' ? 'Live' : match.status}
                    </span>
                  </div>
                  {match.result_description && (
                    <p className="text-sm text-primary mt-1">{match.result_description}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}