import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { LocalPlayer } from '@/lib/localDb';
import type { BatsmanStats } from '@/lib/matchEngine';
import { LogOut } from 'lucide-react';

interface LocalBatsmanCardProps {
  batsman: LocalPlayer | null;
  stats: BatsmanStats | null;
  className?: string;
  onRetireOut?: () => void;
}

export function LocalBatsmanCard({ batsman, stats, className, onRetireOut }: LocalBatsmanCardProps) {
  const [showRetireOption, setShowRetireOption] = useState(false);
  const runs = stats?.runsScored ?? 0;
  const balls = stats?.ballsFaced ?? 0;
  const fours = stats?.fours ?? 0;
  const sixes = stats?.sixes ?? 0;
  
  const strikeRate = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (batsman && onRetireOut) {
      setShowRetireOption(prev => !prev);
    }
  };

  // Close on outside click
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showRetireOption) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setShowRetireOption(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler as any);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler as any);
    };
  }, [showRetireOption]);

  const handleRetire = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRetireOption(false);
    onRetireOut?.();
  };

  return (
    <div ref={cardRef} className={cn("card-player relative", className)}>
      <div 
        className={cn("cursor-pointer", onRetireOut && "active:scale-[0.98] transition-transform")}
        onClick={handleClick}
      >
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

      {/* Retire Out Option */}
      {showRetireOption && onRetireOut && (
        <button
          onClick={handleRetire}
          className="absolute inset-0 bg-destructive/95 rounded-xl flex items-center justify-center gap-2 text-destructive-foreground font-semibold text-sm z-10 animate-in fade-in duration-150"
        >
          <LogOut className="w-4 h-4" />
          Retire Out
        </button>
      )}
    </div>
  );
}
