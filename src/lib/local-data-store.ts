// Local data store for trip analytics when Supabase is not available
// This provides immediate functionality while database issues are resolved

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const TRIPS_FILE = path.join(DATA_DIR, "trips.json");

interface LocalTripData {
  id: string;
  trip_date: string;
  trip_time: string;
  pickup_location: string;
  dropoff_location: string;
  distance: number;
  duration: string;
  platform: string;
  fare_amount: number;
  driver_earnings: number;
  gas_cost: number;
  gas_used_gallons: number;
  profit: number;
  vehicle_model: string;
  vehicle_mpg: number;
  created_at: string;
  image_file?: string;
}

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Load trips from local JSON file
export function loadTripsFromLocal(): LocalTripData[] {
  ensureDataDir();

  if (!fs.existsSync(TRIPS_FILE)) {
    return [];
  }

  try {
    const data = fs.readFileSync(TRIPS_FILE, "utf8");
    return JSON.parse(data) as LocalTripData[];
  } catch (error) {
    console.error("Error loading local trips data:", error);
    return [];
  }
}

// Save trip to local JSON file
export function saveTripToLocal(tripData: any): string {
  ensureDataDir();

  const trips = loadTripsFromLocal();
  const newTrip: LocalTripData = {
    id: generateTripId(),
    trip_date: tripData.trip_date || new Date().toISOString().split("T")[0],
    trip_time: tripData.trip_time || new Date().toTimeString().slice(0, 5),
    pickup_location: tripData.pickup_location || "Unknown Location",
    dropoff_location: tripData.dropoff_location || "Unknown Destination",
    distance: tripData.distance || 0,
    duration: tripData.duration || "0 minutes",
    platform: tripData.platform || "Unknown Platform",
    fare_amount: tripData.fare_amount || 0,
    driver_earnings: tripData.driver_earnings || 0,
    gas_cost: tripData.gas_cost || 0,
    gas_used_gallons: tripData.gas_used_gallons || 0,
    profit: tripData.profit || 0,
    vehicle_model: tripData.vehicle_model || "2003 Honda Odyssey",
    vehicle_mpg: tripData.vehicle_mpg || 19,
    created_at: new Date().toISOString(),
    image_file: tripData.image_file,
  };

  trips.push(newTrip);

  // Keep only last 500 trips to prevent file from getting too large
  const trimmedTrips = trips.slice(-500);

  try {
    fs.writeFileSync(TRIPS_FILE, JSON.stringify(trimmedTrips, null, 2));
    console.log("Trip saved to local storage:", newTrip.id);
    return newTrip.id;
  } catch (error) {
    console.error("Error saving trip to local storage:", error);
    throw new Error("Failed to save trip locally");
  }
}

// Generate a simple trip ID
function generateTripId(): string {
  const timestamp = Date.now().toString();
  const random = Math.random()
    .toString(36)
    .substring(2, 8);
  return `trip_${timestamp}_${random}`;
}

// Get trips within date range
export function getTripsInRange(
  startDate?: string,
  endDate?: string
): LocalTripData[] {
  const trips = loadTripsFromLocal();

  if (!startDate && !endDate) {
    return trips;
  }

  return trips.filter((trip) => {
    const tripDate = trip.trip_date;

    if (startDate && tripDate < startDate) return false;
    if (endDate && tripDate > endDate) return false;

    return true;
  });
}

// Get summary statistics
export function getTripSummary(
  timeframe: "all" | "today" | "week" | "month" = "all"
): any {
  let trips = loadTripsFromLocal();

  // Filter by timeframe
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  switch (timeframe) {
    case "today":
      trips = trips.filter((trip) => trip.trip_date === today);
      break;
    case "week":
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split("T")[0];
      trips = trips.filter((trip) => trip.trip_date >= weekAgoStr);
      break;
    case "month":
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthAgoStr = monthAgo.toISOString().split("T")[0];
      trips = trips.filter((trip) => trip.trip_date >= monthAgoStr);
      break;
  }

  if (trips.length === 0) {
    return {
      total_trips: 0,
      total_earnings: 0,
      total_distance: 0,
      total_profit: 0,
      total_fuel_cost: 0,
      avg_mpg: 19,
      performance_score: 0,
    };
  }

  const totalTrips = trips.length;
  const totalEarnings = trips.reduce(
    (sum, trip) => sum + trip.driver_earnings,
    0
  );
  const totalDistance = trips.reduce((sum, trip) => sum + trip.distance, 0);
  const totalProfit = trips.reduce((sum, trip) => sum + trip.profit, 0);
  const totalFuelCost = trips.reduce((sum, trip) => sum + trip.gas_cost, 0);
  const avgMPG = totalFuelCost > 0 ? totalDistance / (totalFuelCost / 3.5) : 19;

  // Calculate performance score
  let performanceScore = 50; // Base score

  // Profit margin (0-30 points)
  const profitMargin =
    totalEarnings > 0 ? (totalProfit / totalEarnings) * 100 : 0;
  performanceScore += Math.min(profitMargin * 0.5, 30);

  // Fuel efficiency (0-20 points)
  if (avgMPG >= 19) performanceScore += 20;
  else performanceScore += (avgMPG / 19) * 20;

  performanceScore = Math.min(100, Math.max(0, performanceScore));

  return {
    total_trips: totalTrips,
    total_earnings: totalEarnings,
    total_distance: totalDistance,
    total_profit: totalProfit,
    total_fuel_cost: totalFuelCost,
    avg_mpg: avgMPG,
    performance_score: performanceScore,
    profit_margin: profitMargin,
    earnings_per_mile: totalDistance > 0 ? totalEarnings / totalDistance : 0,
    profit_per_mile: totalDistance > 0 ? totalProfit / totalDistance : 0,
    average_trip_profit: totalProfit / totalTrips,
  };
}

// Check if we have any trip data
export function hasTripData(): boolean {
  const trips = loadTripsFromLocal();
  return trips.length > 0;
}

// Get recent trip for debugging
export function getMostRecentTrip(): LocalTripData | null {
  const trips = loadTripsFromLocal();
  if (trips.length === 0) return null;

  return trips.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];
}
