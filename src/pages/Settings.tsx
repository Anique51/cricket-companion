import { MainLayout } from '@/components/layout/MainLayout';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/hooks/useTheme';
import { Moon, Sun, Info } from 'lucide-react';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <MainLayout>
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border">
        <div className="p-4 max-w-lg mx-auto">
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* Theme Toggle */}
        <div className="card-score">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-primary" />
              ) : (
                <Sun className="w-5 h-5 text-accent" />
              )}
              <div>
                <h3 className="font-medium">Dark Mode</h3>
                <p className="text-sm text-muted-foreground">
                  {theme === 'dark' ? 'Dark theme active' : 'Light theme active'}
                </p>
              </div>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
          </div>
        </div>

        {/* App Info */}
        <div className="card-score">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-muted-foreground" />
            <div>
              <h3 className="font-medium">Cricket Scorer</h3>
              <p className="text-sm text-muted-foreground">
                Professional cricket scoring app
              </p>
            </div>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground pt-4">
          Version 1.2.0
        </p>
      </main>
    </MainLayout>
  );
}
