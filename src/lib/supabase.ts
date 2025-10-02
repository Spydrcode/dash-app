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
  // Additional fields for multi-image processing
  tip_amount?: number;
  odometer_reading?: number;
  image_type?: string;
  estimated?: boolean;
  raw_ocr_numbers?: string[];
  raw_ocr_text?: string;
  notes?: string;
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
  // Enhanced schema fields
  initial_estimate?: number;
  final_total?: number;
  tip_variance?: number;
  tip_accuracy?: string;
  screenshot_count?: number;
  has_initial_screenshot?: boolean;
  has_final_screenshot?: boolean;
  trip_status?: string;
}

// New interface for trip_screenshots table
export interface TripScreenshot {
  id?: number;
  trip_id: number;
  screenshot_type:
    | "initial_offer"
    | "final_total"
    | "navigation"
    | "dashboard"
    | "weekly_summary"
    | "other";
  image_path: string;
  upload_timestamp?: string;
  ocr_data?: Record<string, unknown>; // Raw OCR text extracted from image
  extracted_data?: Record<string, unknown>; // Structured data extracted from image
  is_processed?: boolean;
  processing_notes?: string;
  created_at?: string;
}

// New interface for reanalysis sessions
export interface ReanalysisSession {
  id?: number;
  session_id?: string;
  driver_id: string;
  analysis_type: "daily" | "weekly" | "comparison" | "custom";
  date_range_start?: string;
  date_range_end?: string;
  trip_ids?: number[];
  results: Record<string, unknown>;
  created_at?: string;
  execution_time_ms?: number;
}

// Vehicle Maintenance & Fuel Tracking Interfaces
export interface MaintenanceRecord {
  id?: number;
  driver_id: string;
  vehicle_model: string;
  maintenance_type:
    | "oil_change"
    | "oil_filter"
    | "air_filter"
    | "tire_rotation"
    | "brake_service"
    | "transmission"
    | "other";
  description: string;
  cost: number;
  odometer_reading: number;
  service_date: string;
  next_service_due?: number;
  next_service_date?: string;
  service_location?: string;
  receipt_image?: string;
  created_at?: string;
}

export interface FuelRecord {
  id?: number;
  driver_id: string;
  vehicle_model: string;
  fuel_cost: number;
  gallons_purchased: number;
  price_per_gallon: number;
  odometer_reading: number;
  fill_up_date: string;
  gas_station?: string;
  fuel_type?: string;
  receipt_image?: string;
  created_at?: string;
}

export interface VehicleAlert {
  id?: number;
  driver_id: string;
  vehicle_model: string;
  alert_type:
    | "maintenance_due"
    | "maintenance_overdue"
    | "fuel_efficiency_drop"
    | "high_maintenance_cost"
    | "custom";
  alert_message: string;
  severity: "low" | "medium" | "high" | "critical";
  current_odometer?: number;
  due_at_odometer?: number;
  due_date?: string;
  maintenance_type?: string;
  is_dismissed?: boolean;
  created_at?: string;
  dismissed_at?: string;
}
