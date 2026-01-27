import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { Player } from '@/types/cricket';
import { cn } from '@/lib/utils';

interface PlayerSelectModalProps {
  open: boolean;
  onSelect: (playerId: string) => void;
  title: string;
  teamId: string;
  excludePlayerIds?: string[];
  type: 'batsman' | 'bowler';
}

export function PlayerSelectModal({ 
  open, 
  onSelect, 
  title, 
  teamId, 
  excludePlayerIds = [],
  type
}: PlayerSelectModalProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && teamId) {
      loadPlayers();
    }
  }, [open, teamId]);

  const loadPlayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .order('name');
    
    if (!error && data) {
      setPlayers(data.filter(p => !excludePlayerIds.includes(p.id)));
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm mx-auto max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[60vh] -mx-6 px-6">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading players...</div>
          ) : (
            <div className="space-y-2">
              {players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => onSelect(player.id)}
                  className={cn(
                    "w-full p-4 rounded-xl border text-left transition-all",
                    "hover:border-primary hover:bg-primary/5",
                    "active:scale-98",
                    type === 'batsman' 
                      ? "border-primary/20 hover:border-primary" 
                      : "border-cricket-wicket/20 hover:border-cricket-wicket"
                  )}
                >
                  <span className="font-medium text-foreground">{player.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}