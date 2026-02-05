import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { syncAllPendingMatches, getSyncStatus } from '@/lib/syncManager';
import { getMatchesByStatus, clearAllData, type LocalMatch } from '@/lib/localDb';
import type { Match, Team, Innings } from '@/types/cricket';
import { Plus, Clock, Trophy, TrendingUp, Cloud, CloudOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner'; 
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function Index() {
  const navigate = useNavigate();
  const [recentMatches, setRecentMatches] = useState<(Match & { team1?: Team; team2?: Team; innings1?: Innings; innings2?: Innings })[]>([]);
  const [localMatches, setLocalMatches] = useState<LocalMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ matches: 0, teams: 0, players: 0 });
  const [syncStatus, setSyncStatus] = useState({ pendingCount: 0, liveCount: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load sync status first
    const status = await getSyncStatus();
    setSyncStatus({ pendingCount: status.pendingCount, liveCount: status.liveCount });

    // Load local pending/live matches
    const [pending, live] = await Promise.all([
      getMatchesByStatus('PENDING_SYNC'),
      getMatchesByStatus('LIVE'),
    ]);
    setLocalMatches([...live, ...pending]);

    // Load recent matches from Supabase
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (matches) {
      const withTeams = await Promise.all(matches.map(async (match) => {
        const [t1, t2, inningsRes] = await Promise.all([
          supabase.from('teams').select('*').eq('id', match.team1_id).single(),
          supabase.from('teams').select('*').eq('id', match.team2_id).single(),
          supabase.from('innings').select('*').eq('match_id', match.id).order('innings_number')
        ]);
        return { 
          ...match, 
          team1: t1.data || undefined, 
          team2: t2.data || undefined,
          innings1: inningsRes.data?.[0] || undefined,
          innings2: inningsRes.data?.[1] || undefined
        };
      }));
      setRecentMatches(withTeams);
    }

    // Load stats
    const [matchesCount, teamsCount, playersCount] = await Promise.all([
      supabase.from('matches').select('id', { count: 'exact', head: true }),
      supabase.from('teams').select('id', { count: 'exact', head: true }),
      supabase.from('players').select('id', { count: 'exact', head: true })
    ]);

    setStats({
      matches: matchesCount.count || 0,
      teams: teamsCount.count || 0,
      players: playersCount.count || 0
    });

    setLoading(false);
  };

  const handleSyncAll = async (): Promise<boolean> => {
    setIsSyncing(true);
    try {
      const results = await syncAllPendingMatches();
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      if (successCount > 0) {
        toast.success(`${successCount} match${successCount > 1 ? 'es' : ''} synced successfully`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} match${failCount > 1 ? 'es' : ''} failed to sync`);
      }
      
      // Reload data
      await loadData();
      
      return failCount === 0;
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync matches');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearLocalData = async () => {
    setIsClearing(true);
    try {
      await clearAllData();
      toast.success('Local data cleared successfully');
      await loadData();
    } catch (error) {
      console.error('Clear error:', error);
      toast.error('Failed to clear local data');
    } finally {
      setIsClearing(false);
    }
  };

  const getScoreDisplay = (match: typeof recentMatches[0]) => {
    if (!match.innings1) return null;
    const team1Score = match.innings1.batting_team_id === match.team1_id 
      ? match.innings1 
      : match.innings2;
    const team2Score = match.innings1.batting_team_id === match.team2_id 
      ? match.innings1 
      : match.innings2;
    
    return (
      <div className="text-xs text-muted-foreground mt-1">
        {match.team1?.short_name}: {team1Score?.total_runs ?? '-'}/{team1Score?.total_wickets ?? '-'}
        {' • '}
        {match.team2?.short_name}: {team2Score?.total_runs ?? '-'}/{team2Score?.total_wickets ?? '-'}
      </div>
    );
  };

  return (
    <MainLayout>
      {/* Hero Header */}
      <header className="bg-field-gradient text-primary-foreground p-6 pb-8">
        <div className="max-w-lg mx-auto">
          <div>
            <h1 className="text-2xl font-black mb-1">Cricket Scorer</h1>
            <p className="text-sm opacity-80">Professional scoring for your tournaments</p>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto -mt-4 space-y-6">
        {/* Quick Actions */}
        <div className="card-score">
          <Button onClick={() => navigate('/new-match')} className="w-full h-14 text-lg font-bold">
            <Plus className="w-5 h-5 mr-2" /> New Match
          </Button>
        </div>

        {/* Local Data Management */}
        {(localMatches.length > 0 || syncStatus.pendingCount > 0) && (
          <div className="flex gap-2">
            {syncStatus.pendingCount > 0 && (
              <Button
                onClick={handleSyncAll}
                disabled={isSyncing}
                variant="outline"
                className="flex-1"
              >
                {isSyncing ? (
                  <>
                    <Cloud className="w-4 h-4 mr-2 animate-pulse" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4 mr-2" />
                    Sync {syncStatus.pendingCount} Match{syncStatus.pendingCount > 1 ? 'es' : ''}
                  </>
                )}
              </Button>
            )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" disabled={isClearing}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Local Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all locally stored match data. Matches that haven't been synced will be lost permanently. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearLocalData} className="bg-destructive hover:bg-destructive/90">
                    Clear All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card-player text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-primary mb-1" />
            <span className="text-2xl font-black text-foreground">{stats.matches}</span>
            <span className="text-xs text-muted-foreground block">Matches</span>
          </div>
          <div className="card-player text-center">
            <Trophy className="w-5 h-5 mx-auto text-accent mb-1" />
            <span className="text-2xl font-black text-foreground">{stats.teams}</span>
            <span className="text-xs text-muted-foreground block">Teams</span>
          </div>
          <div className="card-player text-center">
            <Clock className="w-5 h-5 mx-auto text-cricket-six mb-1" />
            <span className="text-2xl font-black text-foreground">{stats.players}</span>
            <span className="text-xs text-muted-foreground block">Players</span>
          </div>
        </div>

        {/* Local/Live Matches */}
        {localMatches.length > 0 && (
          <section>
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <CloudOff className="w-5 h-5 text-accent" />
              Local Matches
            </h2>
            <div className="space-y-2">
              {localMatches.map(match => (
                <button
                  key={match.id}
                  onClick={() => navigate(`/match/${match.id}`)}
                  className="card-player w-full text-left hover:border-primary transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">
                        {match.team1ShortName} vs {match.team2ShortName}
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        {match.totalOvers} overs • {new Date(match.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      match.status === 'LIVE' ? 'bg-accent/20 text-accent' :
                      match.status === 'PENDING_SYNC' ? 'bg-primary/10 text-primary' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {match.status === 'LIVE' ? 'Live' : 
                       match.status === 'PENDING_SYNC' ? 'Pending Sync' : 
                       match.status}
                    </span>
                  </div>
                  {match.resultDescription && (
                    <p className="text-sm text-primary mt-1">{match.resultDescription}</p>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Recent Matches from Supabase */}
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
                      {getScoreDisplay(match)}
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
    </MainLayout>
  );
}
