import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Play, Users, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
  matchPaths?: string[];
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/', matchPaths: ['/'] },
  { icon: Play, label: 'Live', path: '/live', matchPaths: ['/match', '/new-match', '/live'] },
  { icon: Users, label: 'Teams', path: '/teams', matchPaths: ['/teams', '/team'] },
  { icon: BarChart3, label: 'Stats', path: '/dashboard', matchPaths: ['/dashboard', '/stats'] },
  { icon: Settings, label: 'Settings', path: '/settings', matchPaths: ['/settings'] },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (item: NavItem) => {
    if (item.matchPaths) {
      return item.matchPaths.some(p => 
        p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
      );
    }
    return location.pathname === item.path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-200 min-w-[60px]",
                active 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className={cn("w-5 h-5 mb-1", active && "scale-110")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
