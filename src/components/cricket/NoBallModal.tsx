import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface NoBallModalProps {
  open: boolean;
  onSelect: (option: 'noball' | 'noball_four' | 'noball_six') => void;
  onClose: () => void;
}

export function NoBallModal({ open, onSelect, onClose }: NoBallModalProps) {
  const handleSelect = (option: 'noball' | 'noball_four' | 'noball_six') => {
    onSelect(option);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">No Ball - Select Runs</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 gap-3 pt-4">
          <button
            onClick={() => handleSelect('noball')}
            className="h-16 rounded-xl font-bold text-lg text-white transition-all active:scale-95"
            style={{ background: 'hsl(var(--cricket-noball))' }}
          >
            No Ball Only (+1)
          </button>
          
          <button
            onClick={() => handleSelect('noball_four')}
            className="h-16 rounded-xl font-bold text-lg text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, hsl(var(--cricket-noball)), hsl(var(--cricket-four)))' }}
          >
            No Ball + 4 Runs (+5)
          </button>
          
          <button
            onClick={() => handleSelect('noball_six')}
            className="h-16 rounded-xl font-bold text-lg text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, hsl(var(--cricket-noball)), hsl(var(--cricket-six)))' }}
          >
            No Ball + 6 Runs (+7)
          </button>
          
          <button
            onClick={onClose}
            className="h-12 rounded-xl font-medium text-muted-foreground bg-muted transition-all active:scale-95"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
