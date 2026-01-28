import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { MatchSetup } from "./components/cricket/MatchSetup";
import MatchScoring from "./pages/MatchScoring";
import TeamsPlayers from "./pages/TeamsPlayers";
import TeamDetail from "./pages/TeamDetail";
import Dashboard from "./pages/Dashboard";
import PlayerStats from "./pages/PlayerStats";
import Settings from "./pages/Settings";
import Live from "./pages/Live";

const queryClient = new QueryClient();

// Initialize theme from localStorage
function ThemeInitializer() {
  useEffect(() => {
    const stored = localStorage.getItem('cricket-theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  }, []);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeInitializer />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/new-match" element={<MatchSetup />} />
          <Route path="/match/:matchId" element={<MatchScoring />} />
          <Route path="/live" element={<Live />} />
          <Route path="/teams" element={<TeamsPlayers />} />
          <Route path="/team/:teamId" element={<TeamDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/stats" element={<PlayerStats />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
