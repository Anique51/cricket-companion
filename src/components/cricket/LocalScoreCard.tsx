import { cn } from '@/lib/utils';
import type { InningsState } from '@/lib/matchEngine';

interface LocalScoreCardProps {
  innings: InningsState | null;
  battingTeamName: string;
  totalOvers: number;
  target?: number | null;
  className?: string;
}

export function LocalScoreCard({ 
  innings, 
  battingTeamName, 
  totalOvers, 
  target,
  className 
}: LocalScoreCardProps) {
  const runs = innings?.totalRuns ?? 0;
  const wickets = innings?.totalWickets ?? 0;
  const completedOvers = innings?.totalOversCompleted ?? 0;
  const legalBallCount = innings?.currentOverBalls ?? 0;
  
  // Display as X.Y where Y is balls bowled in current over
  const oversText = legalBallCount > 0 
    ? `${completedOvers}.${legalBallCount}` 
    : `${completedOvers}.0`;
  
  // Calculate actual overs for rate calculations
  const actualOvers = completedOvers + (legalBallCount / 6);
  
  // Calculate current run rate
  const runRate = actualOvers > 0 ? (runs / actualOvers).toFixed(2) : '0.00';
  
  // Calculate required run rate for chase
  const oversRemaining = totalOvers - completedOvers - (legalBallCount / 6);
  const runsRequired = target ? target - runs : 0;
  const requiredRate = target && oversRemaining > 0 
    ? (runsRequired / oversRemaining).toFixed(2) 
    : null;

  return (
    <div className={cn("card-score", className)}>
      {/* Team Name */}
      <div className="text-center mb-2">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {innings?.inningsNumber === 2 ? '2nd Innings' : '1st Innings'}
        </span>
        <h2 className="text-lg font-bold text-foreground">
          {battingTeamName || 'Batting Team'}
        </h2>
      </div>

      {/* Main Score */}
      <div className="text-center mb-4">
        <div className="score-display-large text-foreground animate-score-pop">
          {runs}
          <span className="text-4xl sm:text-5xl text-muted-foreground">/{wickets}</span>
        </div>
        <div className="text-xl sm:text-2xl font-semibold text-muted-foreground mt-1">
          ({oversText} / {totalOvers} ov)
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
