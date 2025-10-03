// Real-time Insight Update System
// Automatically triggers AI insights refresh when new data is available
//
// ARCHITECTURE NOTES:
// - This runs CLIENT-SIDE in the browser to monitor for new data
// - Calls Next.js API routes (/api/unified-mcp, /api/dashboard-stats)
// - Next.js API routes use GPTOnlyAICoordinator which calls GPT-4 API
// - MCP servers (in /mcp-servers/) are for local Ollama development (not used in production)
// - All AI insights are now generated via GPT-4 API, not localhost MCP servers
//
// ERROR HANDLING:
// - Network errors are normal during app startup and are handled gracefully
// - The monitoring runs in background and will retry automatically
// - No action needed if you see connection errors during first few seconds

export class InsightUpdateManager {
  private static updateQueue: Set<string> = new Set();
  private static isProcessing = false;

  // Trigger insight updates when screenshots are uploaded
  static async onScreenshotUpload(tripId: string) {
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
  static async onTripAnalysisComplete(tripId: string) {
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
  // DISABLED: This causes unnecessary GPT API calls and charges
  private static async preGenerateInsights() {
    // DISABLED TO SAVE API COSTS
    // Previously this would pre-generate insights for week and month timeframes
    // Now insights are only generated when user explicitly requests them
    // This prevents automatic GPT API calls that cost money
    console.log(
      "💰 Insight pre-generation disabled to save API costs - insights load on demand only"
    );
    return;
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
  // DISABLED: This was causing too many API calls and GPT charges
  // Only check for updates when user explicitly uploads screenshots
  static startMonitoring() {
    if (this.monitoringActive || typeof window === "undefined") return;

    this.monitoringActive = true;
    console.log(
      "📸 Screenshot monitoring ready (will check only on manual upload)"
    );

    // REMOVED: Automatic polling every 30 seconds
    // The monitoring will now only happen when:
    // 1. User uploads a screenshot (via InsightUpdateManager.onScreenshotUpload)
    // 2. User manually refreshes the page
    // This prevents unnecessary API calls and GPT charges
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
        // Only log if it's not a typical startup error
        if (response.status !== 500 && response.status !== 503) {
          console.log(
            `📊 Dashboard stats API returned ${
              response.status
            } (will retry later)`
          );
        }
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
      // Silently handle errors - they're expected during startup
      // Only log if it's been more than 30 seconds since page load
      if (typeof window !== "undefined" && performance.now() > 30000) {
        if (error instanceof Error && error.name === "AbortError") {
          // Timeout - this is fine, server might be busy
          return;
        }
        // Other errors after 30s might be worth noting
        console.log(
          "📡 Background screenshot monitoring (this is fine if you just started the app)"
        );
      }
    }
  }

  static stopMonitoring() {
    this.monitoringActive = false;
    console.log("📸 Stopped screenshot processing monitoring");
  }
}
