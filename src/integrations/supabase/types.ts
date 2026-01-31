export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      batsman_innings_stats: {
        Row: {
          balls_faced: number
          batsman_id: string
          batting_order: number
          created_at: string
          fours: number
          id: string
          innings_id: string
          is_out: boolean
          runs_scored: number
          sixes: number
        }
        Insert: {
          balls_faced?: number
          batsman_id: string
          batting_order: number
          created_at?: string
          fours?: number
          id?: string
          innings_id: string
          is_out?: boolean
          runs_scored?: number
          sixes?: number
        }
        Update: {
          balls_faced?: number
          batsman_id?: string
          batting_order?: number
          created_at?: string
          fours?: number
          id?: string
          innings_id?: string
          is_out?: boolean
          runs_scored?: number
          sixes?: number
        }
        Relationships: [
          {
            foreignKeyName: "batsman_innings_stats_batsman_id_fkey"
            columns: ["batsman_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batsman_innings_stats_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "innings"
            referencedColumns: ["id"]
          },
        ]
      }
      bowler_innings_stats: {
        Row: {
          bowler_id: string
          created_at: string
          id: string
          innings_id: string
          no_balls: number
          overs_bowled: number
          runs_conceded: number
          wickets_taken: number
          wides: number
        }
        Insert: {
          bowler_id: string
          created_at?: string
          id?: string
          innings_id: string
          no_balls?: number
          overs_bowled?: number
          runs_conceded?: number
          wickets_taken?: number
          wides?: number
        }
        Update: {
          bowler_id?: string
          created_at?: string
          id?: string
          innings_id?: string
          no_balls?: number
          overs_bowled?: number
          runs_conceded?: number
          wickets_taken?: number
          wides?: number
        }
        Relationships: [
          {
            foreignKeyName: "bowler_innings_stats_bowler_id_fkey"
            columns: ["bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bowler_innings_stats_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "innings"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          ball_number: number
          batsman_id: string
          bowler_id: string
          created_at: string
          id: string
          innings_id: string
          is_legal_delivery: boolean
          is_no_ball: boolean
          is_wicket: boolean
          is_wide: boolean
          over_id: string
          runs_scored: number
        }
        Insert: {
          ball_number: number
          batsman_id: string
          bowler_id: string
          created_at?: string
          id?: string
          innings_id: string
          is_legal_delivery?: boolean
          is_no_ball?: boolean
          is_wicket?: boolean
          is_wide?: boolean
          over_id: string
          runs_scored?: number
        }
        Update: {
          ball_number?: number
          batsman_id?: string
          bowler_id?: string
          created_at?: string
          id?: string
          innings_id?: string
          is_legal_delivery?: boolean
          is_no_ball?: boolean
          is_wicket?: boolean
          is_wide?: boolean
          over_id?: string
          runs_scored?: number
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_batsman_id_fkey"
            columns: ["batsman_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_bowler_id_fkey"
            columns: ["bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "innings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_over_id_fkey"
            columns: ["over_id"]
            isOneToOne: false
            referencedRelation: "overs"
            referencedColumns: ["id"]
          },
        ]
      }
      innings: {
        Row: {
          batting_team_id: string
          bowling_team_id: string
          created_at: string
          id: string
          innings_number: number
          is_completed: boolean
          match_id: string
          total_extras: number
          total_overs_completed: number
          total_runs: number
          total_wickets: number
        }
        Insert: {
          batting_team_id: string
          bowling_team_id: string
          created_at?: string
          id?: string
          innings_number: number
          is_completed?: boolean
          match_id: string
          total_extras?: number
          total_overs_completed?: number
          total_runs?: number
          total_wickets?: number
        }
        Update: {
          batting_team_id?: string
          bowling_team_id?: string
          created_at?: string
          id?: string
          innings_number?: number
          is_completed?: boolean
          match_id?: string
          total_extras?: number
          total_overs_completed?: number
          total_runs?: number
          total_wickets?: number
        }
        Relationships: [
          {
            foreignKeyName: "innings_batting_team_id_fkey"
            columns: ["batting_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innings_bowling_team_id_fkey"
            columns: ["bowling_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_batting_stats: {
        Row: {
          balls: number
          batting_order: number
          created_at: string
          dismissal_type: string | null
          fours: number
          id: string
          innings_number: number
          is_out: boolean
          match_id: string
          player_id: string
          runs: number
          sixes: number
          team_id: string
        }
        Insert: {
          balls?: number
          batting_order?: number
          created_at?: string
          dismissal_type?: string | null
          fours?: number
          id?: string
          innings_number: number
          is_out?: boolean
          match_id: string
          player_id: string
          runs?: number
          sixes?: number
          team_id: string
        }
        Update: {
          balls?: number
          batting_order?: number
          created_at?: string
          dismissal_type?: string | null
          fours?: number
          id?: string
          innings_number?: number
          is_out?: boolean
          match_id?: string
          player_id?: string
          runs?: number
          sixes?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_batting_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_batting_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_batting_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_bowling_stats: {
        Row: {
          balls: number
          created_at: string
          id: string
          innings_number: number
          match_id: string
          no_balls: number
          overs: number
          player_id: string
          runs_conceded: number
          team_id: string
          wickets: number
          wides: number
        }
        Insert: {
          balls?: number
          created_at?: string
          id?: string
          innings_number: number
          match_id: string
          no_balls?: number
          overs?: number
          player_id: string
          runs_conceded?: number
          team_id: string
          wickets?: number
          wides?: number
        }
        Update: {
          balls?: number
          created_at?: string
          id?: string
          innings_number?: number
          match_id?: string
          no_balls?: number
          overs?: number
          player_id?: string
          runs_conceded?: number
          team_id?: string
          wickets?: number
          wides?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_bowling_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_bowling_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_bowling_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          innings_id: string | null
          match_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          innings_id?: string | null
          match_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          innings_id?: string | null
          match_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_events_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "innings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          result_description: string | null
          status: string
          team1_id: string
          team2_id: string
          total_overs: number
          winner_team_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          result_description?: string | null
          status?: string
          team1_id: string
          team2_id: string
          total_overs?: number
          winner_team_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          result_description?: string | null
          status?: string
          team1_id?: string
          team2_id?: string
          total_overs?: number
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      overs: {
        Row: {
          bowler_id: string
          created_at: string
          id: string
          innings_id: string
          is_completed: boolean
          over_number: number
          runs_conceded: number
          wickets_taken: number
        }
        Insert: {
          bowler_id: string
          created_at?: string
          id?: string
          innings_id: string
          is_completed?: boolean
          over_number: number
          runs_conceded?: number
          wickets_taken?: number
        }
        Update: {
          bowler_id?: string
          created_at?: string
          id?: string
          innings_id?: string
          is_completed?: boolean
          over_number?: number
          runs_conceded?: number
          wickets_taken?: number
        }
        Relationships: [
          {
            foreignKeyName: "overs_bowler_id_fkey"
            columns: ["bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overs_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "innings"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          id: string
          name: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          short_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          short_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          short_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
