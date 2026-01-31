-- Create match-scoped batting stats table
CREATE TABLE public.match_batting_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  innings_number INTEGER NOT NULL,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  runs INTEGER NOT NULL DEFAULT 0,
  balls INTEGER NOT NULL DEFAULT 0,
  fours INTEGER NOT NULL DEFAULT 0,
  sixes INTEGER NOT NULL DEFAULT 0,
  is_out BOOLEAN NOT NULL DEFAULT false,
  dismissal_type TEXT,
  batting_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create match-scoped bowling stats table
CREATE TABLE public.match_bowling_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  innings_number INTEGER NOT NULL,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  overs NUMERIC NOT NULL DEFAULT 0,
  balls INTEGER NOT NULL DEFAULT 0,
  runs_conceded INTEGER NOT NULL DEFAULT 0,
  wickets INTEGER NOT NULL DEFAULT 0,
  wides INTEGER NOT NULL DEFAULT 0,
  no_balls INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.match_batting_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_bowling_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for match_batting_stats
CREATE POLICY "Public read access" ON public.match_batting_stats FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.match_batting_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.match_batting_stats FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.match_batting_stats FOR DELETE USING (true);

-- Create RLS policies for match_bowling_stats
CREATE POLICY "Public read access" ON public.match_bowling_stats FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.match_bowling_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.match_bowling_stats FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.match_bowling_stats FOR DELETE USING (true);

-- Create indexes for faster queries
CREATE INDEX idx_match_batting_stats_match_id ON public.match_batting_stats(match_id);
CREATE INDEX idx_match_batting_stats_innings ON public.match_batting_stats(match_id, innings_number);
CREATE INDEX idx_match_bowling_stats_match_id ON public.match_bowling_stats(match_id);
CREATE INDEX idx_match_bowling_stats_innings ON public.match_bowling_stats(match_id, innings_number);