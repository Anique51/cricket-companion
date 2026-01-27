import { cn } from '@/lib/utils';
import type { Innings, Team } from '@/types/cricket';

interface ScoreCardProps {
  innings: Innings | null;
  battingTeam: Team | null;
  totalOvers: number;
  target?: number;
  className?: string;
}

export function ScoreCard({ 
  innings, 
  battingTeam, 
  totalOvers, 
  target,
  className 
}: ScoreCardProps) {
  const runs = innings?.total_runs ?? 0;
  const wickets = innings?.total_wickets ?? 0;
  const overs = innings?.total_overs_completed ?? 0;
  
  // Calculate current run rate
  const runRate = overs > 0 ? (runs / overs).toFixed(2) : '0.00';
  
  // Calculate required run rate for chase
  const oversRemaining = totalOvers - overs;
  const runsRequired = target ? target - runs : 0;
  const requiredRate = target && oversRemaining > 0 
    ? (runsRequired / oversRemaining).toFixed(2) 
    : null;

  return (
    <div className={cn("card-score", className)}>
      {/* Team Name */}
      <div className="text-center mb-2">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {innings?.innings_number === 2 ? '2nd Innings' : '1st Innings'}
        </span>
        <h2 className="text-lg font-bold text-foreground">
          {battingTeam?.name || 'Batting Team'}
        </h2>
      </div>

      {/* Main Score */}
      <div className="text-center mb-4">
        <div className="score-display-large text-foreground animate-score-pop">
          {runs}
          <span className="text-4xl sm:text-5xl text-muted-foreground">/{wickets}</span>
        </div>
        <div className="text-xl sm:text-2xl font-semibold text-muted-foreground mt-1">
          ({overs.toFixed(1)} / {totalOvers} ov)
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="text-center">
          <span className="block text-muted-foreground">Run Rate</span>
          <span className="font-bold text-foreground">{runRate}</span>
        </div>
        
        {target && (
          <>
            <div className="text-center">
              <span className="block text-muted-foreground">Target</span>
              <span className="font-bold text-foreground">{target}</span>
            </div>
            <div className="text-center">
              <span className="block text-muted-foreground">Need</span>
              <span className="font-bold text-foreground">{runsRequired > 0 ? runsRequired : 0}</span>
            </div>
            {requiredRate && runsRequired > 0 && (
              <div className="text-center">
                <span className="block text-muted-foreground">Req RR</span>
                <span className="font-bold text-foreground">{requiredRate}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}