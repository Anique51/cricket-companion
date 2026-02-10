import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { getTeamPlayers, type LocalPlayer } from '@/lib/localDb';
import type { Player } from '@/types/cricket';
import { cn } from '@/lib/utils';

const EMPTY_EXCLUDE: string[] = [];

interface PlayerSelectModalProps {
  open: boolean;
  onSelect: (playerId: string) => void;
  title: string;
  teamId: string;
  excludePlayerIds?: string[];
  retiredPlayerIds?: string[];
  type: 'batsman' | 'bowler';
  onClose?: () => void;
}

const EMPTY_RETIRED: string[] = [];

export function PlayerSelectModal({ 
  open, 
  onSelect, 
  title, 
  teamId, 
  excludePlayerIds = EMPTY_EXCLUDE,
  retiredPlayerIds = EMPTY_RETIRED,
  type,
  onClose
}: PlayerSelectModalProps) {
  const [players, setPlayers] = useState<(Player | LocalPlayer)[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && teamId) {
      loadPlayers();
    }
  }, [open, teamId, excludePlayerIds]);

  const loadPlayers = async () => {
    setLoading(true);
    
    try {
      // Try local IndexedDB first
      const localPlayers = await getTeamPlayers(teamId);
      
      if (localPlayers.length > 0) {
        // Filter out excluded players (dismissed batsmen)
        const availablePlayers = localPlayers.filter(p => !excludePlayerIds.includes(p.id));
        setPlayers(availablePlayers);
      } else {
        // Fallback to Supabase
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .eq('team_id', teamId)
          .order('name');
        
        if (!error && data) {
          // Filter out excluded players (dismissed batsmen)
          const availablePlayers = data.filter(p => !excludePlayerIds.includes(p.id));
          setPlayers(availablePlayers);
        }
      }
    } catch (error) {
      console.error('Error loading players:', error);
      // Fallback to Supabase on error
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .order('name');
      
      if (data) {
        const availablePlayers = data.filter(p => !excludePlayerIds.includes(p.id));
        setPlayers(availablePlayers);
      }
    }
    
    setLoading(false);
  };

  // Get player name (works for both types)
  const getPlayerName = (player: Player | LocalPlayer) => {
    return player.name;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && onClose) onClose(); }}>
      <DialogContent className="max-w-sm mx-auto max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[60vh] -mx-6 px-6">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading players...</div>
          ) : players.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No available players
            </div>
          ) : (
            <div className="space-y-2">
              {players.map((player) => {
                const isRetired = retiredPlayerIds.includes(player.id);
                return (
                  <button
                    key={player.id}
                    onClick={() => onSelect(player.id)}
                    className={cn(
                      "w-full p-4 rounded-xl border text-left transition-all",
                      "hover:border-primary hover:bg-primary/5",
                      "active:scale-98",
                      type === 'batsman' 
                        ? "border-primary/20 hover:border-primary" 
                        : "border-cricket-wicket/20 hover:border-cricket-wicket",
                      isRetired && "border-amber-500/30 bg-amber-500/5"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{getPlayerName(player)}</span>
                      {isRetired && (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                          Retired Out
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
