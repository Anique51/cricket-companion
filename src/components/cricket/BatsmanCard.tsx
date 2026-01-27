import { cn } from '@/lib/utils';
import type { Player, BatsmanInningsStats } from '@/types/cricket';

interface BatsmanCardProps {
  batsman: Player | null;
  stats: BatsmanInningsStats | null;
  className?: string;
}

export function BatsmanCard({ batsman, stats, className }: BatsmanCardProps) {
  const runs = stats?.runs_scored ?? 0;
  const balls = stats?.balls_faced ?? 0;
  const fours = stats?.fours ?? 0;
  const sixes = stats?.sixes ?? 0;
  
  const strikeRate = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';

  return (
    <div className={cn("card-player", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground uppercase">Batting</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-foreground text-lg">
            {batsman?.name || 'Select Batsman'}
          </h3>
          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
            <span>{balls}b</span>
            <span>{fours} 4s</span>
            <span>{sixes} 6s</span>
            <span>SR: {strikeRate}</span>
          </div>
        </div>
        
        <div className="text-right">
          <span className="text-3xl font-black text-foreground">{runs}</span>
        </div>
      </div>
    </div>
  );
}