// Vehicle Maintenance & Fuel Tracking System
// Database schema extensions for maintenance records, fuel costs, and alerts

// Add to supabase.ts types
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
  next_service_due?: number; // Next odometer reading for this service
  next_service_date?: string; // Estimated next service date
  service_location?: string;
  receipt_image?: string;
  created_at?: string;
}

export interface FuelRecord {
  id?: number;
  driver_id: string;
  vehicle_model: string;
  cost: number;
  gallons: number;
  price_per_gallon: number;
  odometer_reading: number;
  fill_date: string;
  station_location?: string;
  fuel_type?: string;
  mpg_calculated?: number;
  miles_driven?: number;
  created_at?: string;
}

export interface VehicleAlert {
  id?: number;
  driver_id: string;
  vehicle_model: string;
  alert_type: string;
  title: string;
  description: string;
  urgency_level: "low" | "medium" | "high" | "critical";
  current_odometer: number;
  target_odometer?: number;
  due_date?: string;
  estimated_cost?: number;
  is_dismissed?: boolean;
  dismissed_at?: string;
  created_at?: string;
}

export interface VehicleStats {
  totalMaintenanceCost: number;
  totalFuelCost: number;
  avgFuelPrice: number;
  currentMPG: number;
  milesPerYear: number;
  lastOilChange: number;
  lastOilChangeDate: string;
  nextOilChangeDue: number;
  maintenanceAlerts: VehicleAlert[];
  fuelEfficiencyTrend: "improving" | "declining" | "stable";
}

// Maintenance Schedules for Honda Odyssey 2003
export const HONDA_ODYSSEY_2003_MAINTENANCE_SCHEDULE = {
  oil_change: {
    interval_miles: 5000,
    interval_months: 6,
    cost_estimate: 40,
    description: "Engine oil and filter change",
  },
  air_filter: {
    interval_miles: 12000,
    interval_months: 12,
    cost_estimate: 25,
    description: "Engine air filter replacement",
  },
  transmission_fluid: {
    interval_miles: 30000,
    interval_months: 24,
    cost_estimate: 120,
    description: "Transmission fluid service",
  },
  brake_service: {
    interval_miles: 25000,
    interval_months: 18,
    cost_estimate: 200,
    description: "Brake pad inspection/replacement",
  },
  tire_rotation: {
    interval_miles: 6000,
    interval_months: 6,
    cost_estimate: 30,
    description: "Tire rotation and pressure check",
  },
  coolant_flush: {
    interval_miles: 60000,
    interval_months: 60,
    cost_estimate: 100,
    description: "Coolant system flush",
  },
  spark_plugs: {
    interval_miles: 100000,
    interval_months: 72,
    cost_estimate: 150,
    description: "Spark plug replacement",
  },
};

// Fuel efficiency calculations
export const calculateRealNetProfit = (
  tripEarnings: number,
  tripDistance: number,
  currentMPG: number,
  avgFuelPrice: number,
  maintenanceCostPerMile: number
): {
  grossEarnings: number;
  fuelCost: number;
  maintenanceCost: number;
  netProfit: number;
  profitMargin: number;
} => {
  const grossEarnings = tripEarnings;
  const fuelCost = (tripDistance / currentMPG) * avgFuelPrice;
  const maintenanceCost = tripDistance * maintenanceCostPerMile;
  const netProfit = grossEarnings - fuelCost - maintenanceCost;
  const profitMargin =
    grossEarnings > 0 ? (netProfit / grossEarnings) * 100 : 0;

  return {
    grossEarnings,
    fuelCost,
    maintenanceCost,
    netProfit,
    profitMargin,
  };
};

// Alert generation logic
export const generateMaintenanceAlerts = (
  currentOdometer: number,
  lastMaintenanceRecords: MaintenanceRecord[],
  vehicle: string = "2003 Honda Odyssey"
): VehicleAlert[] => {
  const alerts: VehicleAlert[] = [];
  const schedule = HONDA_ODYSSEY_2003_MAINTENANCE_SCHEDULE;

  Object.entries(schedule).forEach(([maintenanceType, config]) => {
    const lastService = lastMaintenanceRecords
      .filter((record) => record.maintenance_type === maintenanceType)
      .sort((a, b) => b.odometer_reading - a.odometer_reading)[0];

    if (lastService) {
      const milesSinceService = currentOdometer - lastService.odometer_reading;
      const dueAtMiles = lastService.odometer_reading + config.interval_miles;
      const milesOverdue = currentOdometer - dueAtMiles;

      if (milesOverdue > 1000) {
        alerts.push({
          driver_id: "default-driver",
          vehicle_model: vehicle,
          alert_type: "maintenance_overdue",
          title: `${config.description} Overdue`,
          description: `${config.description} is ${milesOverdue} miles overdue`,
          urgency_level: "critical",
          current_odometer: currentOdometer,
          target_odometer: dueAtMiles,
          estimated_cost: config.cost_estimate,
          is_dismissed: false,
        });
      } else if (milesSinceService >= config.interval_miles * 0.9) {
        alerts.push({
          driver_id: "default-driver",
          vehicle_model: vehicle,
          alert_type: "maintenance_due",
          title: `${config.description} Due Soon`,
          description: `${config.description} due in ${dueAtMiles -
            currentOdometer} miles`,
          urgency_level:
            milesSinceService >= config.interval_miles ? "high" : "medium",
          current_odometer: currentOdometer,
          target_odometer: dueAtMiles,
          estimated_cost: config.cost_estimate,
          is_dismissed: false,
        });
      }
    } else {
      // No record found - suggest initial service
      alerts.push({
        driver_id: "default-driver",
        vehicle_model: vehicle,
        alert_type: "maintenance_due",
        title: `${config.description} Recommended`,
        description: `No ${
          config.description
        } record found - service recommended`,
        urgency_level: "medium",
        current_odometer: currentOdometer,
        estimated_cost: config.cost_estimate,
        is_dismissed: false,
      });
    }
  });

  return alerts;
};
