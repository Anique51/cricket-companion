import { cn } from '@/lib/utils';
import type { Player, BowlerInningsStats } from '@/types/cricket';

interface BowlerCardProps {
  bowler: Player | null;
  stats: BowlerInningsStats | null;
  className?: string;
}

export function BowlerCard({ bowler, stats, className }: BowlerCardProps) {
  const overs = stats?.overs_bowled ?? 0;
  const runs = stats?.runs_conceded ?? 0;
  const wickets = stats?.wickets_taken ?? 0;
  const wides = stats?.wides ?? 0;
  const noBalls = stats?.no_balls ?? 0;
  
  const economy = overs > 0 ? (runs / overs).toFixed(2) : '0.00';

  return (
    <div className={cn("card-player", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cricket-wicket" />
          <span className="text-xs font-medium text-muted-foreground uppercase">Bowling</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-foreground text-lg">
            {bowler?.name || 'Select Bowler'}
          </h3>
          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
            <span>{overs}ov</span>
            <span>Econ: {economy}</span>
            <span>Wd: {wides}</span>
            <span>Nb: {noBalls}</span>
          </div>
        </div>
        
        <div className="text-right">
          <span className="text-2xl font-black text-foreground">{wickets}</span>
          <span className="text-lg text-muted-foreground">/{runs}</span>
        </div>
      </div>
    </div>
  );
}