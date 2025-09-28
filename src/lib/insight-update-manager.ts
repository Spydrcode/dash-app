// Real-time Insight Update System
// Automatically triggers AI insights refresh when new data is available

export class InsightUpdateManager {
  private static updateQueue: Set<string> = new Set();
  private static isProcessing = false;

  // Trigger insight updates when screenshots are uploaded
  static async onScreenshotUpload(tripId: string, screenshotData: any) {
    console.log(
      `📸 Screenshot uploaded for trip ${tripId} - queuing insight update`
    );

    this.updateQueue.add(tripId);

    // Debounce updates to avoid excessive processing
    setTimeout(() => {
      this.processUpdateQueue();
    }, 2000); // Wait 2 seconds for more uploads
  }

  // Trigger insight updates when trip analysis completes
  static async onTripAnalysisComplete(tripId: string, analysisData: any) {
    console.log(
      `🔍 Analysis completed for trip ${tripId} - queuing insight update`
    );

    this.updateQueue.add(tripId);

    // Immediate update for analysis completion
    setTimeout(() => {
      this.processUpdateQueue();
    }, 500);
  }

  // Process queued updates
  private static async processUpdateQueue() {
    if (this.isProcessing || this.updateQueue.size === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      console.log(
        `🤖 Processing ${
          this.updateQueue.size
        } trip updates for AI insights refresh`
      );

      // Clear the queue
      const tripIds = Array.from(this.updateQueue);
      this.updateQueue.clear();

      // Trigger dashboard refresh event
      this.notifyDashboardUpdate(tripIds);

      // Optional: Pre-generate insights for common timeframes
      await this.preGenerateInsights();
    } catch (error) {
      console.error("Error processing insight updates:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Notify dashboard to refresh
  private static notifyDashboardUpdate(tripIds: string[]) {
    // This would typically use WebSockets or Server-Sent Events
    // For now, we'll log and rely on the custom event system
    console.log(
      `📡 Notifying dashboard of updates for trips: ${tripIds.join(", ")}`
    );

    // In a production system, you'd emit a real-time event here
    // For now, the dashboard will refresh when the user navigates back
  }

  // Pre-generate insights for better performance
  private static async preGenerateInsights() {
    // Only run in browser environment
    if (typeof window === "undefined") {
      return;
    }

    const timeframes = ["week", "month"];

    for (const timeframe of timeframes) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch("/api/unified-mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            action: "ai_insights",
            timeframe,
            includeProjections: true,
            includeTrends: true,
            cacheBuster: Date.now(),
          }),
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`✅ Pre-generated ${timeframe} insights`);
        } else {
          console.warn(
            `Failed to pre-generate ${timeframe} insights: ${response.status}`
          );
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.warn(`Pre-generation of ${timeframe} insights timed out`);
        } else {
          console.warn(
            `Failed to pre-generate ${timeframe} insights:`,
            error instanceof Error ? error.message : "Unknown error"
          );
        }
      }
    }
  }

  // Force immediate refresh (called by upload components)
  static async forceRefresh() {
    console.log("🔄 Force refreshing AI insights...");

    // Dispatch custom event for immediate dashboard refresh
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dashboardRefresh", {
          detail: {
            reason: "force_refresh",
            timestamp: Date.now(),
          },
        })
      );
    }
  }
}

// Auto-update system for screenshot processing
export class ScreenshotProcessingMonitor {
  private static monitoringActive = false;

  // Start monitoring for screenshot processing completion
  static startMonitoring() {
    if (this.monitoringActive || typeof window === "undefined") return;

    this.monitoringActive = true;
    console.log("📸 Starting screenshot processing monitoring...");

    // Wait 10 seconds before starting monitoring to let the app fully load
    setTimeout(() => {
      // Check for unprocessed screenshots every 30 seconds
      setInterval(async () => {
        await this.checkUnprocessedScreenshots();
      }, 30000);

      // Do an initial check after 5 seconds
      setTimeout(() => {
        this.checkUnprocessedScreenshots();
      }, 5000);
    }, 10000);
  }

  // Check for unprocessed screenshots and trigger insights when processed
  private static async checkUnprocessedScreenshots() {
    try {
      // Only run this check if we're in a browser environment
      if (typeof window === "undefined") {
        return;
      }

      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch("/api/dashboard-stats", {
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(
          `Dashboard stats API returned ${response.status}: ${
            response.statusText
          }`
        );
        return;
      }

      const data = await response.json();

      if (data.success && data.stats) {
        const { processedScreenshots, totalScreenshots } = data.stats;

        // If processing is complete and we have new data, refresh insights
        if (processedScreenshots === totalScreenshots && totalScreenshots > 0) {
          const lastCheck = localStorage.getItem("lastInsightUpdate");
          const now = Date.now().toString();

          if (!lastCheck || parseInt(now) - parseInt(lastCheck) > 60000) {
            console.log(
              "📊 Screenshot processing complete - refreshing insights"
            );
            InsightUpdateManager.forceRefresh();
            localStorage.setItem("lastInsightUpdate", now);
          }
        }
      }
    } catch (error) {
      // Don't log error if it's just an abort (timeout)
      if (error instanceof Error && error.name === "AbortError") {
        console.warn(
          "Screenshot processing check timed out - server might be starting up"
        );
      } else {
        console.warn(
          "Error checking screenshot processing (this is normal during startup):",
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }
  }

  static stopMonitoring() {
    this.monitoringActive = false;
    console.log("📸 Stopped screenshot processing monitoring");
  }
}
