import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser/frontend operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (API routes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface TripData {
  trip_type?: string;
  total_trips?: number;
  individual_trips?: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  pickup_location?: string;
  dropoff_location?: string;
  fare_amount?: number;
  distance?: number;
  duration?: string;
  trip_date?: string;
  trip_time?: string;
  platform?: string;
  driver_earnings?: number;
  gas_used_gallons?: number;
  gas_cost?: number;
  expenses?: number;
  other_expenses?: number;
  profit?: number;
  vehicle_model?: string;
  vehicle_mpg?: number;
}

export interface AIInsights {
  trip_analysis?: {
    type: string;
    trip_count: number;
    avg_profit_per_trip: number;
  };
  vehicle_analysis?: {
    model: string;
    fuel_efficiency: number;
    efficiency_rating: string;
    gas_cost_percentage: number;
  };
  efficiency_score?: number;
  profit_margin?: number;
  performance_category?: string;
  suggestions?: string[];
  peak_hour_analysis?: {
    is_peak_hour: boolean;
    recommended_hours: string[];
  };
}

export interface Predictions {
  next_trip_profit?: number;
  weekly_average?: number;
  monthly_projection?: number;
  confidence?: string;
  factors?: {
    platform_bonus?: number;
    efficiency_bonus?: number;
    peak_hour_bonus?: number;
  };
}

export interface TripRecord {
  id?: number;
  driver_id: string;
  image_path?: string;
  upload_date?: string;
  trip_data: TripData;
  ai_insights?: AIInsights;
  predictions?: Predictions;
  vehicle_model?: string;
  total_profit?: number;
  total_distance?: number;
  gas_cost?: number;
  created_at?: string;
}
