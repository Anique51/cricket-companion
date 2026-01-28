import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import type { Match, Team } from '@/types/cricket';
import { Plus, Play, Clock } from 'lucide-react';

export default function Live() {
  const navigate = useNavigate();
  const [liveMatches, setLiveMatches] = useState<(Match & { team1?: Team; team2?: Team })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLiveMatches();
  }, []);

  const loadLiveMatches = async () => {
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false });

    if (matches) {
      const withTeams = await Promise.all(matches.map(async (match) => {
        const [t1, t2] = await Promise.all([
          supabase.from('teams').select('*').eq('id', match.team1_id).single(),
          supabase.from('teams').select('*').eq('id', match.team2_id).single()
        ]);
        return { ...match, team1: t1.data || undefined, team2: t2.data || undefined };
      }));
      setLiveMatches(withTeams);
    }
    setLoading(false);
  };

  return (
    <MainLayout>
      <header className="sticky top-0 z-10 bg-field-gradient text-primary-foreground">
        <div className="p-4 max-w-lg mx-auto">
          <h1 className="text-xl font-bold">Live Matches</h1>
          <p className="text-xs opacity-80">Score and manage live matches</p>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        <Button onClick={() => navigate('/new-match')} className="w-full h-14 text-lg font-bold">
          <Plus className="w-5 h-5 mr-2" /> New Match
        </Button>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : liveMatches.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No live matches</p>
            <p className="text-sm text-muted-foreground">Start a new match to begin scoring</p>
          </div>
        ) : (
          <div className="space-y-3">
            {liveMatches.map(match => (
              <button
                key={match.id}
                onClick={() => navigate(`/match/${match.id}`)}
                className="card-score w-full text-left hover:border-primary transition-colors border border-transparent"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-accent font-medium uppercase flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    Live
                  </span>
                  <span className="text-xs text-muted-foreground">{match.total_overs} overs</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-lg block">
                      {match.team1?.name} vs {match.team2?.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Started {new Date(match.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Play className="w-8 h-8 text-primary" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </MainLayout>
  );
}
