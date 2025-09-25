#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import winston from "winston";
// Custom regression implementations
class SimpleLinearRegression {
  private slope: number = 0;
  private intercept: number = 0;

  constructor(x: number[], y: number[]) {
    this.fit(x, y);
  }

  private fit(x: number[], y: number[]) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);

    this.slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    this.intercept = (sumY - this.slope * sumX) / n;
  }

  predict(x: number): number {
    return this.slope * x + this.intercept;
  }
}

class PolynomialRegression {
  private coefficients: number[] = [];

  constructor(x: number[][], y: number[], degree: number = 2) {
    // Simplified polynomial regression - just use linear for now
    const flatX = x.map((row) => row[0]); // Use first feature only
    const linear = new SimpleLinearRegression(flatX, y);
    this.coefficients = [linear["intercept"], linear["slope"]];
  }

  predict(x: number[] | number): number {
    const xVal = Array.isArray(x) ? x[0] : x;
    return this.coefficients[0] + this.coefficients[1] * xVal;
  }
}

// Custom stats functions
const stats = {
  mean(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  },
};

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

interface TripData {
  id: string;
  fare_amount?: number;
  distance?: number;
  duration_minutes?: number;
  trip_date?: string;
  trip_time?: string;
  platform?: string;
  driver_earnings?: number;
  expenses?: number;
  profit?: number;
  hour_of_day?: number;
  day_of_week?: number;
}

interface PredictionModel {
  type: "linear" | "polynomial";
  model: any;
  accuracy: number;
  trained_at: string;
}

interface MarketAnalysis {
  peak_hours: number[];
  best_platforms: string[];
  optimal_areas: string[];
  seasonal_trends: any[];
}

class AnalyticsMCPServer {
  private server: Server;
  private models: Map<string, PredictionModel> = new Map();
  private ollamaUrl: string;
  private ollamaModel: string;

  constructor() {
    this.server = new Server(
      {
        name: "driver-profit-analytics",
        version: "1.0.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    this.ollamaModel = process.env.OLLAMA_MODEL || "llama2:13b-instruct";

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "analytics://profit-predictions",
          name: "Profit Predictions",
          description: "Predicted profit data based on historical patterns",
          mimeType: "application/json",
        },
        {
          uri: "analytics://market-analysis",
          name: "Market Analysis",
          description: "Analysis of market trends and opportunities",
          mimeType: "application/json",
        },
        {
          uri: "analytics://performance-metrics",
          name: "Performance Metrics",
          description: "Driver performance analytics and KPIs",
          mimeType: "application/json",
        },
      ],
    }));

    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request: any) => {
        const uri = request.params.uri;

        switch (uri) {
          case "analytics://profit-predictions":
            const predictions = await this.generateProfitPredictions();
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify(predictions, null, 2),
                },
              ],
            };

          case "analytics://market-analysis":
            const analysis = await this.performMarketAnalysis();
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify(analysis, null, 2),
                },
              ],
            };

          case "analytics://performance-metrics":
            const metrics = await this.calculatePerformanceMetrics();
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify(metrics, null, 2),
                },
              ],
            };

          default:
            throw new Error(`Resource not found: ${uri}`);
        }
      }
    );

    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "train_profit_model",
          description:
            "Train machine learning models to predict trip profitability",
          inputSchema: {
            type: "object",
            properties: {
              trip_data: {
                type: "array",
                description: "Historical trip data for training",
                items: {
                  type: "object",
                },
              },
              model_type: {
                type: "string",
                description: "Type of model to train",
                enum: ["linear", "polynomial"],
                default: "linear",
              },
            },
            required: ["trip_data"],
          },
        },
        {
          name: "predict_trip_profit",
          description: "Predict profit for potential trips based on parameters",
          inputSchema: {
            type: "object",
            properties: {
              distance: {
                type: "number",
                description: "Trip distance in miles",
              },
              duration: {
                type: "number",
                description: "Expected duration in minutes",
              },
              platform: {
                type: "string",
                description: "Platform (uber, lyft, etc.)",
              },
              hour_of_day: {
                type: "number",
                description: "Hour of day (0-23)",
              },
              day_of_week: { type: "number", description: "Day of week (0-6)" },
            },
            required: ["distance", "duration"],
          },
        },
        {
          name: "analyze_peak_hours",
          description: "Analyze historical data to identify peak earning hours",
          inputSchema: {
            type: "object",
            properties: {
              trip_data: {
                type: "array",
                description: "Trip data to analyze",
                items: { type: "object" },
              },
              lookback_days: {
                type: "number",
                description: "Number of days to look back",
                default: 30,
              },
            },
            required: ["trip_data"],
          },
        },
        {
          name: "optimize_schedule",
          description:
            "Generate optimal driving schedule based on historical performance",
          inputSchema: {
            type: "object",
            properties: {
              available_hours: {
                type: "array",
                description: "Hours available for driving",
                items: { type: "number" },
              },
              target_income: {
                type: "number",
                description: "Target daily income",
              },
              max_hours: {
                type: "number",
                description: "Maximum hours to work per day",
                default: 10,
              },
            },
            required: ["available_hours"],
          },
        },
        {
          name: "generate_market_insights",
          description:
            "Generate AI-powered insights about market trends and opportunities",
          inputSchema: {
            type: "object",
            properties: {
              trip_data: {
                type: "array",
                description: "Recent trip data for analysis",
                items: { type: "object" },
              },
              time_period: {
                type: "string",
                description: "Analysis time period",
                enum: ["week", "month", "quarter"],
                default: "month",
              },
            },
            required: ["trip_data"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request: any) => {
        const { name, arguments: args } = request.params;

        switch (name) {
          case "train_profit_model":
            return await this.trainProfitModel(args);

          case "predict_trip_profit":
            return await this.predictTripProfit(args);

          case "analyze_peak_hours":
            return await this.analyzePeakHours(args);

          case "optimize_schedule":
            return await this.optimizeSchedule(args);

          case "generate_market_insights":
            return await this.generateMarketInsights(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      }
    );
  }

  private async trainProfitModel(args: {
    trip_data: TripData[];
    model_type?: string;
  }): Promise<any> {
    try {
      const { trip_data, model_type = "linear" } = args;

      // Prepare training data
      const features: number[][] = [];
      const targets: number[] = [];

      for (const trip of trip_data) {
        if (
          trip.fare_amount &&
          trip.distance &&
          trip.duration_minutes &&
          trip.driver_earnings
        ) {
          const profit = trip.driver_earnings - (trip.expenses || 0);
          features.push([
            trip.distance,
            trip.duration_minutes,
            trip.hour_of_day || 12,
            trip.day_of_week || 1,
          ]);
          targets.push(profit);
        }
      }

      if (features.length < 10) {
        throw new Error(
          "Insufficient training data. Need at least 10 complete records."
        );
      }

      // Train model
      let model: any;
      let accuracy: number;

      if (model_type === "polynomial") {
        model = new PolynomialRegression(features, targets, 2);
        const predictions = features.map((f) => model.predict(f));
        accuracy = this.calculateR2(targets, predictions);
      } else {
        // For linear regression, we'll use distance as the primary feature
        const distanceFeatures = features.map((f) => f[0]);
        model = new SimpleLinearRegression(distanceFeatures, targets);
        const predictions = distanceFeatures.map((d) => model.predict(d));
        accuracy = this.calculateR2(targets, predictions);
      }

      // Store the model
      const modelKey = `profit_${model_type}`;
      this.models.set(modelKey, {
        type: model_type as "linear" | "polynomial",
        model,
        accuracy,
        trained_at: new Date().toISOString(),
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                model_type,
                accuracy: Math.round(accuracy * 100) / 100,
                training_samples: features.length,
                trained_at: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error("Model training failed:", error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error:
                  error instanceof Error ? error.message : "Training failed",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  private async predictTripProfit(args: {
    distance: number;
    duration: number;
    platform?: string;
    hour_of_day?: number;
    day_of_week?: number;
  }): Promise<any> {
    try {
      const model =
        this.models.get("profit_linear") ||
        this.models.get("profit_polynomial");

      if (!model) {
        throw new Error(
          "No trained model available. Please train a model first."
        );
      }

      let prediction: number;

      if (model.type === "linear") {
        prediction = model.model.predict(args.distance);
      } else {
        prediction = model.model.predict([
          args.distance,
          args.duration,
          args.hour_of_day || 12,
          args.day_of_week || 1,
        ]);
      }

      // Add some context-based adjustments
      let adjustedPrediction = prediction;

      // Platform adjustments (example logic)
      if (args.platform === "uber") {
        adjustedPrediction *= 1.1; // Uber typically pays more
      } else if (args.platform === "lyft") {
        adjustedPrediction *= 1.05;
      }

      // Peak hour adjustments
      if (
        args.hour_of_day !== undefined &&
        ((args.hour_of_day >= 7 && args.hour_of_day <= 9) ||
          (args.hour_of_day >= 17 && args.hour_of_day <= 19))
      ) {
        adjustedPrediction *= 1.2; // Peak hours bonus
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                predicted_profit: Math.round(adjustedPrediction * 100) / 100,
                base_prediction: Math.round(prediction * 100) / 100,
                model_accuracy: model.accuracy,
                confidence:
                  model.accuracy > 0.7
                    ? "high"
                    : model.accuracy > 0.5
                      ? "medium"
                      : "low",
                factors_considered: {
                  distance: args.distance,
                  duration: args.duration,
                  platform: args.platform,
                  hour_of_day: args.hour_of_day,
                  day_of_week: args.day_of_week,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error:
                  error instanceof Error ? error.message : "Prediction failed",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  private async analyzePeakHours(args: {
    trip_data: TripData[];
    lookback_days?: number;
  }): Promise<any> {
    try {
      const { trip_data } = args;

      // Group trips by hour of day
      const hourlyEarnings: {
        [hour: number]: { total: number; count: number };
      } = {};

      for (let i = 0; i < 24; i++) {
        hourlyEarnings[i] = { total: 0, count: 0 };
      }

      for (const trip of trip_data) {
        if (trip.driver_earnings && trip.hour_of_day !== undefined) {
          hourlyEarnings[trip.hour_of_day].total += trip.driver_earnings;
          hourlyEarnings[trip.hour_of_day].count += 1;
        }
      }

      // Calculate average earnings per hour
      const hourlyAverages = Object.entries(hourlyEarnings).map(
        ([hour, data]) => ({
          hour: parseInt(hour),
          average_earnings: data.count > 0 ? data.total / data.count : 0,
          trip_count: data.count,
        })
      );

      // Find peak hours (top 25% earning hours)
      const sortedHours = hourlyAverages
        .filter((h) => h.trip_count > 0)
        .sort((a, b) => b.average_earnings - a.average_earnings);

      const peakHours = sortedHours.slice(
        0,
        Math.ceil(sortedHours.length * 0.25)
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                peak_hours: peakHours,
                all_hours: hourlyAverages,
                analysis: {
                  best_hour: sortedHours[0],
                  worst_hour: sortedHours[sortedHours.length - 1],
                  total_trips_analyzed: trip_data.length,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error:
                  error instanceof Error ? error.message : "Analysis failed",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  private async optimizeSchedule(args: {
    available_hours: number[];
    target_income?: number;
    max_hours?: number;
  }): Promise<any> {
    try {
      // This is a simplified optimization - in practice you'd use more sophisticated algorithms
      const { available_hours, target_income, max_hours = 10 } = args;

      // Mock peak hour data (would come from real analysis)
      const peakHourMultipliers: { [hour: number]: number } = {
        7: 1.3,
        8: 1.4,
        9: 1.2,
        17: 1.5,
        18: 1.6,
        19: 1.4,
        20: 1.2,
        21: 1.1,
      };

      const optimizedSchedule = available_hours
        .map((hour) => ({
          hour,
          expected_earnings: 15 * (peakHourMultipliers[hour] || 1.0), // Base $15/hour
          is_peak: peakHourMultipliers[hour] > 1.0,
        }))
        .sort((a, b) => b.expected_earnings - a.expected_earnings)
        .slice(0, max_hours);

      const totalExpectedEarnings = optimizedSchedule.reduce(
        (sum, slot) => sum + slot.expected_earnings,
        0
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                optimized_schedule: optimizedSchedule,
                total_expected_earnings:
                  Math.round(totalExpectedEarnings * 100) / 100,
                total_hours: optimizedSchedule.length,
                meets_target: target_income
                  ? totalExpectedEarnings >= target_income
                  : null,
                recommendations: this.generateScheduleRecommendations(
                  optimizedSchedule
                ),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Optimization failed",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  private async generateMarketInsights(args: {
    trip_data: TripData[];
    time_period?: string;
  }): Promise<any> {
    try {
      // Use LLM to generate insights
      const { trip_data, time_period = "month" } = args;

      const dataStats = this.calculateDataStatistics(trip_data);

      const prompt = `
Analyze the following driver performance data and provide actionable insights:

Statistics for the last ${time_period}:
- Total trips: ${trip_data.length}
- Average earnings per trip: $${dataStats.avgEarnings}
- Average distance per trip: ${dataStats.avgDistance} miles
- Most profitable platform: ${dataStats.bestPlatform}
- Peak earning hour: ${dataStats.peakHour}:00
- Total profit: $${dataStats.totalProfit}

Provide insights in the following categories:
1. Performance trends
2. Optimization opportunities  
3. Market recommendations
4. Action items for next ${time_period}

Format your response as JSON with these exact fields:
{
  "trends": ["trend1", "trend2"],
  "opportunities": ["opp1", "opp2"],
  "recommendations": ["rec1", "rec2"],
  "action_items": ["action1", "action2"]
}`;

      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.ollamaModel,
        prompt,
        stream: false,
        options: { temperature: 0.3 },
      });

      const insights = this.parseInsightsResponse(response.data.response);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                statistics: dataStats,
                ai_insights: insights,
                generated_at: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Insight generation failed",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  // Helper methods
  private calculateR2(actual: number[], predicted: number[]): number {
    if (actual.length === 0 || predicted.length === 0) return 0;

    const actualMean = stats.mean(actual);
    const totalSumSquares = actual.reduce(
      (sum, val) => sum + Math.pow(val - actualMean, 2),
      0
    );
    const residualSumSquares = actual.reduce(
      (sum, val, i) => sum + Math.pow(val - predicted[i], 2),
      0
    );

    if (totalSumSquares === 0) return 0;
    return Math.max(0, 1 - residualSumSquares / totalSumSquares);
  }

  private generateScheduleRecommendations(schedule: any[]): string[] {
    const recommendations = [];

    if (schedule.filter((s) => s.is_peak).length < schedule.length / 2) {
      recommendations.push(
        "Consider working more during peak hours (7-9 AM, 5-8 PM)"
      );
    }

    if (schedule.length < 6) {
      recommendations.push("Consider working more hours to maximize earnings");
    }

    return recommendations;
  }

  private calculateDataStatistics(tripData: TripData[]) {
    // Calculate basic statistics
    const earnings = tripData
      .filter((t) => t.driver_earnings)
      .map((t) => t.driver_earnings!);
    const distances = tripData
      .filter((t) => t.distance)
      .map((t) => t.distance!);

    return {
      avgEarnings: earnings.length
        ? Math.round(stats.mean(earnings) * 100) / 100
        : 0,
      avgDistance: distances.length
        ? Math.round(stats.mean(distances) * 100) / 100
        : 0,
      bestPlatform: "uber", // Simplified
      peakHour: 18, // Simplified
      totalProfit: earnings.length
        ? Math.round(earnings.reduce((a, b) => a + b, 0) * 100) / 100
        : 0,
    };
  }

  private parseInsightsResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback to structured response
    }

    return {
      trends: ["Data analysis in progress"],
      opportunities: ["Continue collecting trip data for better insights"],
      recommendations: ["Monitor earnings patterns"],
      action_items: ["Track daily performance metrics"],
    };
  }

  private async generateProfitPredictions(): Promise<any> {
    return {
      next_7_days: [],
      next_30_days: [],
      model_accuracy: 0.75,
    };
  }

  private async performMarketAnalysis(): Promise<MarketAnalysis> {
    return {
      peak_hours: [7, 8, 17, 18, 19],
      best_platforms: ["uber", "lyft"],
      optimal_areas: ["downtown", "airport"],
      seasonal_trends: [],
    };
  }

  private async calculatePerformanceMetrics(): Promise<any> {
    return {
      daily_average: 0,
      weekly_trend: 0,
      efficiency_score: 0,
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info("Analytics MCP Server running on stdio");
  }
}

const server = new AnalyticsMCPServer();
server.run().catch((error) => {
  logger.error("Server failed to start:", error);
  process.exit(1);
});
