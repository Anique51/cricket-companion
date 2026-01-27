-- Cricket Scoring Application Database Schema

-- Teams table
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    short_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Players table
CREATE TABLE public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Matches table
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team1_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    team2_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    total_overs INTEGER NOT NULL DEFAULT 10,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    winner_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    result_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Innings table
CREATE TABLE public.innings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    innings_number INTEGER NOT NULL CHECK (innings_number IN (1, 2)),
    batting_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    bowling_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    total_runs INTEGER DEFAULT 0 NOT NULL,
    total_wickets INTEGER DEFAULT 0 NOT NULL,
    total_overs_completed NUMERIC(4,1) DEFAULT 0 NOT NULL,
    total_extras INTEGER DEFAULT 0 NOT NULL,
    is_completed BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(match_id, innings_number)
);

-- Overs table
CREATE TABLE public.overs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innings_id UUID REFERENCES public.innings(id) ON DELETE CASCADE NOT NULL,
    over_number INTEGER NOT NULL,
    bowler_id UUID REFERENCES public.players(id) ON DELETE SET NULL NOT NULL,
    runs_conceded INTEGER DEFAULT 0 NOT NULL,
    wickets_taken INTEGER DEFAULT 0 NOT NULL,
    is_completed BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(innings_id, over_number)
);

-- Deliveries table (ball-by-ball truth source)
CREATE TABLE public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    over_id UUID REFERENCES public.overs(id) ON DELETE CASCADE NOT NULL,
    innings_id UUID REFERENCES public.innings(id) ON DELETE CASCADE NOT NULL,
    ball_number INTEGER NOT NULL,
    is_legal_delivery BOOLEAN DEFAULT true NOT NULL,
    runs_scored INTEGER DEFAULT 0 NOT NULL,
    is_wide BOOLEAN DEFAULT false NOT NULL,
    is_no_ball BOOLEAN DEFAULT false NOT NULL,
    is_wicket BOOLEAN DEFAULT false NOT NULL,
    batsman_id UUID REFERENCES public.players(id) ON DELETE SET NULL NOT NULL,
    bowler_id UUID REFERENCES public.players(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Batsman innings stats
CREATE TABLE public.batsman_innings_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innings_id UUID REFERENCES public.innings(id) ON DELETE CASCADE NOT NULL,
    batsman_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    runs_scored INTEGER DEFAULT 0 NOT NULL,
    balls_faced INTEGER DEFAULT 0 NOT NULL,
    fours INTEGER DEFAULT 0 NOT NULL,
    sixes INTEGER DEFAULT 0 NOT NULL,
    is_out BOOLEAN DEFAULT false NOT NULL,
    batting_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(innings_id, batsman_id)
);

-- Bowler innings stats
CREATE TABLE public.bowler_innings_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innings_id UUID REFERENCES public.innings(id) ON DELETE CASCADE NOT NULL,
    bowler_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    overs_bowled NUMERIC(4,1) DEFAULT 0 NOT NULL,
    runs_conceded INTEGER DEFAULT 0 NOT NULL,
    wickets_taken INTEGER DEFAULT 0 NOT NULL,
    wides INTEGER DEFAULT 0 NOT NULL,
    no_balls INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(innings_id, bowler_id)
);

-- Match events for logging
CREATE TABLE public.match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    innings_id UUID REFERENCES public.innings(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables (public access for this app - no auth required)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.innings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batsman_innings_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bowler_innings_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth required for this scoring app)
CREATE POLICY "Public read access" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.teams FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.teams FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.players FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.players FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.players FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.matches FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.matches FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.innings FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.innings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.innings FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.innings FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.overs FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.overs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.overs FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.overs FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.deliveries FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.deliveries FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.deliveries FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.deliveries FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.batsman_innings_stats FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.batsman_innings_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.batsman_innings_stats FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.batsman_innings_stats FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.bowler_innings_stats FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.bowler_innings_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.bowler_innings_stats FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.bowler_innings_stats FOR DELETE USING (true);

CREATE POLICY "Public read access" ON public.match_events FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.match_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.match_events FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.match_events FOR DELETE USING (true);

-- Insert default teams
INSERT INTO public.teams (name, short_name) VALUES ('Team Alpha', 'ALP');
INSERT INTO public.teams (name, short_name) VALUES ('Team Beta', 'BET');