import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function MainLayout({ children, hideNav = false }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className={hideNav ? "" : "pb-20"}>
        {children}
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
