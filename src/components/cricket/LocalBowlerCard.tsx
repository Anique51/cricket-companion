import { cn } from '@/lib/utils';
import type { LocalPlayer } from '@/lib/localDb';
import type { BowlerStats } from '@/lib/matchEngine';

interface LocalBowlerCardProps {
  bowler: LocalPlayer | null;
  stats: BowlerStats | null;
  currentOverBalls?: number;
  className?: string;
  onSelectBowler?: () => void;
}

export function LocalBowlerCard({ bowler, stats, currentOverBalls = 0, className, onSelectBowler }: LocalBowlerCardProps) {
  const completedOvers = stats?.oversBowled ?? 0;
  const runs = stats?.runsConceded ?? 0;
  const wickets = stats?.wicketsTaken ?? 0;
  const wides = stats?.wides ?? 0;
  const noBalls = stats?.noBalls ?? 0;
  
  // Display overs including current over balls
  const oversDisplay = currentOverBalls > 0 
    ? `${completedOvers}.${currentOverBalls}` 
    : `${completedOvers}`;
  
  // Calculate actual overs for economy
  const actualOvers = completedOvers + (currentOverBalls / 6);
  const economy = actualOvers > 0 ? (runs / actualOvers).toFixed(2) : '0.00';

  const noBowlerSelected = !bowler;

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
          {noBowlerSelected ? (
            <button 
              onClick={onSelectBowler}
              className="font-bold text-primary text-lg hover:underline cursor-pointer bg-transparent border-none p-0"
            >
              Select Bowler
            </button>
          ) : (
            <h3 className="font-bold text-foreground text-lg">
              {bowler.name}
            </h3>
          )}
          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
            <span>{oversDisplay} ov</span>
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
