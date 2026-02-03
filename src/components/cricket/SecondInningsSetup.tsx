import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTeamPlayers, type LocalPlayer } from '@/lib/localDb';
import type { Team, Match, Innings } from '@/types/cricket';
import { ChevronLeft } from 'lucide-react';

interface SecondInningsSetupProps {
  match: Match;
  firstInnings: Innings;
  team1: Team | null;
  team2: Team | null;
  onStart: (battingTeamId: string, batsmanId: string, bowlerId: string) => void;
  onCancel: () => void;
}

export function SecondInningsSetup({ 
  match, 
  firstInnings, 
  team1, 
  team2, 
  onStart,
  onCancel
}: SecondInningsSetupProps) {
  const [battingPlayers, setBattingPlayers] = useState<LocalPlayer[]>([]);
  const [bowlingPlayers, setBowlingPlayers] = useState<LocalPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // The batting team for 2nd innings is the bowling team from 1st innings
  const battingTeamId = firstInnings.bowling_team_id;
  const bowlingTeamId = firstInnings.batting_team_id;
  const battingTeam = team1?.id === battingTeamId ? team1 : team2;
  const bowlingTeam = team1?.id === bowlingTeamId ? team1 : team2;

  const [openingBatsmanId, setOpeningBatsmanId] = useState<string>('');
  const [openingBowlerId, setOpeningBowlerId] = useState<string>('');

  useEffect(() => {
    loadPlayers();
  }, [battingTeamId, bowlingTeamId]);

  const loadPlayers = async () => {
    try {
      // Load from local IndexedDB
      const [batters, bowlers] = await Promise.all([
        getTeamPlayers(battingTeamId),
        getTeamPlayers(bowlingTeamId)
      ]);
      
      setBattingPlayers(batters);
      setBowlingPlayers(bowlers);
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  const target = firstInnings.total_runs + 1;
  const canStart = openingBatsmanId && openingBowlerId;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <button onClick={onCancel} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">2nd Innings Setup</h1>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-6">
        {/* Target */}
        <div className="text-center p-6 bg-primary/10 rounded-2xl">
          <span className="text-sm text-muted-foreground uppercase">Target</span>
          <div className="text-5xl font-black text-primary mt-1">{target}</div>
          <p className="text-muted-foreground mt-2">
            {battingTeam?.name} needs {target} runs to win
          </p>
        </div>

        {/* Opening Batsman */}
        <div className="card-score space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">1</span>
            <h2 className="font-bold">Opening Batsman ({battingTeam?.short_name || battingTeam?.name})</h2>
          </div>

          <Select value={openingBatsmanId} onValueChange={setOpeningBatsmanId}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select batsman" />
            </SelectTrigger>
            <SelectContent>
              {battingPlayers.map(player => (
                <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Opening Bowler */}
        <div className="card-score space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">2</span>
            <h2 className="font-bold">Opening Bowler ({bowlingTeam?.short_name || bowlingTeam?.name})</h2>
          </div>

          <Select value={openingBowlerId} onValueChange={setOpeningBowlerId}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select bowler" />
            </SelectTrigger>
            <SelectContent>
              {bowlingPlayers.map(player => (
                <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Start Button */}
        <Button 
          onClick={() => onStart(battingTeamId, openingBatsmanId, openingBowlerId)}
          disabled={!canStart}
          className="w-full h-14 text-lg font-bold"
        >
          Start 2nd Innings
        </Button>
      </main>
    </div>
  );
}
