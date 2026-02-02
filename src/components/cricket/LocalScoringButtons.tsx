import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { ScoringAction } from '@/hooks/useLocalMatch';

interface LocalScoringButtonsProps {
  onScore: (action: ScoringAction) => void;
  disabled?: boolean;
  className?: string;
}

export function LocalScoringButtons({ 
  onScore, 
  disabled,
  className 
}: LocalScoringButtonsProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="grid grid-cols-3 gap-3">
        {/* Row 1: Dot, 4, 6 */}
        <button
          onClick={() => onScore('dot')}
          disabled={disabled}
          className="scoring-button-primary"
        >
          Dot
        </button>
        
        <button
          onClick={() => onScore('four')}
          disabled={disabled}
          className="scoring-button-boundary"
        >
          4 Runs
        </button>
        
        <button
          onClick={() => onScore('six')}
          disabled={disabled}
          className="scoring-button-six"
        >
          6 Runs
        </button>

        {/* Row 2: Wide, No Ball, Wicket */}
        <button
          onClick={() => onScore('wide')}
          disabled={disabled}
          className="scoring-button-extra"
        >
          Wide
        </button>
        
        <button
          onClick={() => onScore('noball')}
          disabled={disabled}
          className="scoring-button-noball"
        >
          No Ball
        </button>
        
        <button
          onClick={() => onScore('wicket')}
          disabled={disabled}
          className="scoring-button-wicket"
        >
          Wicket
        </button>
      </div>
    </div>
  );
}
