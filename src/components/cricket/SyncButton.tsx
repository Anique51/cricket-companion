import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SyncButtonProps {
  onSync: () => Promise<boolean>;
  isPendingSync: boolean;
  isSynced: boolean;
  className?: string;
}

export function SyncButton({ onSync, isPendingSync, isSynced, className }: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (isSyncing || isSynced) return;
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
    }
  };

  if (isSynced) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-primary", className)}>
        <Cloud className="w-4 h-4" />
        <span>Synced</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
        "transition-all active:scale-95",
        isPendingSync 
          ? "bg-accent/20 text-accent-foreground" 
          : "bg-muted text-muted-foreground",
        isSyncing && "opacity-70",
        className
      )}
    >
      {isSyncing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Syncing...</span>
        </>
      ) : (
        <>
          <CloudOff className="w-4 h-4" />
          <span>{isPendingSync ? 'Sync to Cloud' : 'Offline'}</span>
        </>
      )}
    </button>
  );
}
