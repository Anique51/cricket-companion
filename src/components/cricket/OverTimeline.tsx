import { cn } from '@/lib/utils';
import type { Delivery } from '@/types/cricket';

interface OverTimelineProps {
  deliveries: Delivery[];
  legalBallCount: number;
  className?: string;
}

function getBallClass(delivery: Delivery): string {
  if (delivery.is_wicket) return 'ball-wicket';
  if (delivery.is_wide) return 'ball-wide';
  if (delivery.is_no_ball) return 'ball-noball';
  if (delivery.runs_scored === 6) return 'ball-six';
  if (delivery.runs_scored === 4) return 'ball-four';
  if (delivery.runs_scored === 0) return 'ball-dot';
  return 'ball-runs';
}

function getBallLabel(delivery: Delivery): string {
  if (delivery.is_wicket) return 'W';
  if (delivery.is_wide) return 'Wd';
  if (delivery.is_no_ball) return 'Nb';
  if (delivery.runs_scored === 0) return '•';
  return delivery.runs_scored.toString();
}

export function OverTimeline({ deliveries, legalBallCount, className }: OverTimelineProps) {
  // Show slots for 6 legal balls, plus any extras
  const totalSlots = Math.max(6, deliveries.length);
  const slots = Array.from({ length: totalSlots }, (_, i) => deliveries[i] || null);

  return (
    <div className={cn("card-player", className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase">This Over</span>
        <span className="text-sm font-bold text-foreground">{legalBallCount}/6 balls</span>
      </div>
      
      <div className="flex gap-2 flex-wrap justify-center">
        {slots.map((delivery, index) => (
          <div
            key={index}
            className={cn(
              "ball-indicator",
              delivery ? getBallClass(delivery) : "bg-muted/50 border-2 border-dashed border-muted-foreground/20"
            )}
          >
            {delivery ? getBallLabel(delivery) : ''}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-muted border border-muted-foreground/30" />
          Dot
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full ball-four" />
          4
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full ball-six" />
          6
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full ball-wide" />
          Wide
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full ball-noball" />
          NB
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full ball-wicket" />
          Wicket
        </span>
      </div>
    </div>
  );
}