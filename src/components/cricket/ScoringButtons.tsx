import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { ScoringAction } from '@/types/cricket';

interface ScoringButtonsProps {
  onScore: (action: ScoringAction) => void;
  isProcessing: boolean;
  disabled?: boolean;
  className?: string;
}

export function ScoringButtons({ 
  onScore, 
  isProcessing, 
  disabled,
  className 
}: ScoringButtonsProps) {
  const isDisabled = isProcessing || disabled;

  return (
    <div className={cn("relative", className)}>
      {/* Processing Overlay */}
      {isProcessing && (
        <div className="processing-overlay">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Recording...</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {/* Row 1: Dot, 4, 6 */}
        <button
          onClick={() => onScore('dot')}
          disabled={isDisabled}
          className="scoring-button-primary"
        >
          Dot
        </button>
        
        <button
          onClick={() => onScore('four')}
          disabled={isDisabled}
          className="scoring-button-boundary"
        >
          4 Runs
        </button>
        
        <button
          onClick={() => onScore('six')}
          disabled={isDisabled}
          className="scoring-button-six"
        >
          6 Runs
        </button>

        {/* Row 2: Wide, No Ball, Wicket */}
        <button
          onClick={() => onScore('wide')}
          disabled={isDisabled}
          className="scoring-button-extra"
        >
          Wide
        </button>
        
        <button
          onClick={() => onScore('noball')}
          disabled={isDisabled}
          className="scoring-button-noball"
        >
          No Ball
        </button>
        
        <button
          onClick={() => onScore('wicket')}
          disabled={isDisabled}
          className="scoring-button-wicket"
        >
          Wicket
        </button>
      </div>
    </div>
  );
}