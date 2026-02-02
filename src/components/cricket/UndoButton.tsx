import { Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UndoButtonProps {
  onUndo: () => void;
  disabled: boolean;
  className?: string;
}

export function UndoButton({ onUndo, disabled, className }: UndoButtonProps) {
  return (
    <button
      onClick={onUndo}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center gap-2 h-12 px-4 rounded-xl",
        "bg-muted text-muted-foreground font-medium text-sm",
        "transition-all active:scale-95",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
        "hover:bg-muted/80",
        className
      )}
    >
      <Undo2 className="w-4 h-4" />
      <span>Undo Last Ball</span>
    </button>
  );
}
