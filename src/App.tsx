import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { MatchSetup } from "./components/cricket/MatchSetup";
import MatchScoring from "./pages/MatchScoring";
import TeamsPlayers from "./pages/TeamsPlayers";
import Dashboard from "./pages/Dashboard";
import PlayerStats from "./pages/PlayerStats";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/new-match" element={<MatchSetup />} />
          <Route path="/match/:matchId" element={<MatchScoring />} />
          <Route path="/teams" element={<TeamsPlayers />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/stats" element={<PlayerStats />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;