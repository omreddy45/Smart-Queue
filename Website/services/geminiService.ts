import { GoogleGenAI, Type } from "@google/genai";
import { BackendService } from "./mockBackend";
import { QueueStats } from "../types";

const getClient = () => {
  // Try the new API key first, fallback to old one for compatibility
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY or VITE_API_KEY is not set in .env file");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const GeminiService = {
  /**
   * Predicts wait time and provides reasoning for Students.
   */
  predictWaitTime: async (canteenId: string, queueLength: number, foodItem: string): Promise<{ estimatedMinutes: number, reasoning: string }> => {
    const client = getClient();
    
    if (!client) {
      return { estimatedMinutes: Math.max(5, queueLength * 3), reasoning: "Estimated based on queue length." };
    }

    const stats = await BackendService.getStats(canteenId);
    const now = new Date();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    const timeOfDay = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const prompt = `
      You are an AI managing a university canteen queue.
      Context:
      - Queue: ${queueLength} people
      - Item: "${foodItem}"
      - Time: ${dayOfWeek}, ${timeOfDay}
      - Avg Wait: ${stats.averageWaitTime} min
      
      Task: Estimate wait time and give a 1-sentence friendly reason for the student.
      Example Reason: "It's lunch rush, so grills are busy!" or "Smoothies are quick today."
    `;

    try {
      const response = await client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              estimatedMinutes: { type: Type.INTEGER },
              reasoning: { type: Type.STRING }
            }
          }
        }
      });

      const json = JSON.parse(response.text || '{}');
      return {
        estimatedMinutes: json.estimatedMinutes || Math.max(5, queueLength * 3),
        reasoning: json.reasoning || "Calculating based on live traffic."
      };
    } catch (error) {
      console.error("Gemini prediction failed:", error);
      return { estimatedMinutes: Math.max(5, queueLength * 3), reasoning: "Standard estimation." };
    }
  },

  /**
   * Generates a daily insight report for Admins.
   */
  generateQueueInsights: async (stats: QueueStats): Promise<string> => {
     const client = getClient();
     
     // Handle empty queue edge case
     if (stats.totalOrdersToday === 0 || stats.activeQueueLength === 0) {
       return `✓ Queue Clear\n• No active orders in queue\n• Perfect time to restock and prepare for next rush\n• System ready for incoming orders`;
     }

     if (!client) return "AI Analytics unavailable - Please set VITE_API_KEY in .env file";

     const prompt = `
        Analyze these canteen stats and provide brief insights:
        - Total Orders Today: ${stats.totalOrdersToday}
        - Avg Wait Time: ${stats.averageWaitTime} minutes
        - Active Queue: ${stats.activeQueueLength}
        - Peak Hour: ${stats.peakHour}

        Provide 3 bullet points about queue efficiency and suggestions.
        Keep each point under 20 words.
     `;

     try {
        const response = await client.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
        });
        return response.text || "Analysis complete.";
     } catch (e) {
         console.error("Gemini error:", e);
         return `Queue Summary\n• Total Orders: ${stats.totalOrdersToday}\n• Avg Wait: ${stats.averageWaitTime}m\n• Peak: ${stats.peakHour}`;
     }
  },

  /**
   * Analyzes if an order should be marked as complete based on actual prep time vs estimated time.
   * Returns AI reasoning for the completion decision.
   */
  analyzeOrderCompletion: async (foodItem: string, estimatedWaitMinutes: number, actualWaitMinutes: number, isReadyForPickup: boolean): Promise<{ shouldComplete: boolean, reasoning: string }> => {
    const client = getClient();
    
    if (!client) {
      return { 
        shouldComplete: actualWaitMinutes >= estimatedWaitMinutes, 
        reasoning: "Order time threshold reached."
      };
    }

    const prompt = `
      You are a smart queue management AI for a university canteen.
      
      Order Details:
      - Food Item: "${foodItem}"
      - Estimated Wait: ${estimatedWaitMinutes} minutes
      - Actual Wait: ${actualWaitMinutes} minutes
      - Currently Ready for Pickup: ${isReadyForPickup}
      
      Task: Determine if this order should be marked as COMPLETE based on the time and readiness.
      Consider: If ready for pickup and actual time >= estimated time, it's likely complete.
      
      Respond with a JSON containing:
      - shouldComplete: boolean (true if order should be marked complete)
      - reasoning: string (1-sentence explanation for the decision)
    `;

    try {
      const response = await client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              shouldComplete: { type: Type.BOOLEAN },
              reasoning: { type: Type.STRING }
            }
          }
        }
      });

      const json = JSON.parse(response.text || '{}');
      return {
        shouldComplete: json.shouldComplete !== undefined ? json.shouldComplete : (actualWaitMinutes >= estimatedWaitMinutes && isReadyForPickup),
        reasoning: json.reasoning || "Processing order completion."
      };
    } catch (error) {
      console.error("Completion analysis failed:", error);
      return { 
        shouldComplete: actualWaitMinutes >= estimatedWaitMinutes && isReadyForPickup, 
        reasoning: "Standard completion time reached."
      };
    }
  },

  /**
   * Predicts ETA based on historical data, peak hours, and food item preparation time.
   * Considers time of day to adjust estimates during rush hours.
   */
  predictETAWithHistoricalData: async (canteenId: string, foodItem: string, queueLength: number, historicalData: any[]): Promise<{ estimatedMinutes: number, reasoning: string, isPeakHour: boolean }> => {
    const client = getClient();
    
    if (!client) {
      const basePrepTime = Math.min(15, Math.max(5, queueLength * 2));
      return { 
        estimatedMinutes: basePrepTime, 
        reasoning: "Based on queue length.",
        isPeakHour: false
      };
    }

    const now = new Date();
    const currentHour = now.getHours();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

    // Calculate average prep time for this food item
    const itemHistory = historicalData.filter(d => d.foodItem === foodItem);
    const avgPrepTime = itemHistory.length > 0 
      ? Math.round(itemHistory.reduce((sum, d) => sum + d.prepTimeMinutes, 0) / itemHistory.length)
      : 8;

    const prompt = `
      You are an AI that predicts food preparation times in a university canteen.
      
      Context:
      - Food Item: "${foodItem}"
      - Queue Length: ${queueLength} people
      - Current Time: ${currentHour}:00 on ${dayOfWeek}
      - Avg Prep Time (Historical): ${avgPrepTime} minutes
      - Peak Hours: 12-1 PM, 6-7 PM (usually)
      
      Historical Data Summary:
      - Total historical orders for this item: ${itemHistory.length}
      ${itemHistory.length > 0 ? `- Average preparation: ${avgPrepTime} min` : '- No historical data available'}
      
      Task: Predict wait time considering:
      1. Current time (peak hours add 30-50% to wait time)
      2. Queue length (each person adds ~2-3 min base, ${avgPrepTime} min to prepare)
      3. Historical patterns for this specific food
      
      Return JSON with:
      - estimatedMinutes: number (final prediction)
      - reasoning: string (1-sentence explanation)
      - isPeakHour: boolean (true if current hour is likely peak)
    `;

    try {
      const response = await client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              estimatedMinutes: { type: Type.INTEGER },
              reasoning: { type: Type.STRING },
              isPeakHour: { type: Type.BOOLEAN }
            }
          }
        }
      });

      const json = JSON.parse(response.text || '{}');
      const isPeakHour = (currentHour >= 11 && currentHour <= 14) || (currentHour >= 17 && currentHour <= 19);
      
      return {
        estimatedMinutes: json.estimatedMinutes || (avgPrepTime + queueLength * 2.5),
        reasoning: json.reasoning || `${avgPrepTime} min prep + queue time`,
        isPeakHour: json.isPeakHour !== undefined ? json.isPeakHour : isPeakHour
      };
    } catch (error) {
      console.error("ETA prediction failed:", error);
      const isPeakHour = (currentHour >= 11 && currentHour <= 14) || (currentHour >= 17 && currentHour <= 19);
      const multiplier = isPeakHour ? 1.4 : 1;
      return { 
        estimatedMinutes: Math.round((avgPrepTime + queueLength * 2.5) * multiplier), 
        reasoning: `${avgPrepTime}min prep${isPeakHour ? ' + peak hour surge' : ''}`,
        isPeakHour
      };
    }
  },

  /**
   * Generates high-quality food images.
   */
  generateMenuImage: async (prompt: string, size: '1K' | '2K' | '4K'): Promise<string | null> => {
    if (typeof (window as any).aistudio !== 'undefined') {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if(!hasKey) {
             throw new Error("API_KEY_REQUIRED");
        }
    }

    const client = getClient();
    if (!client) return null;

    try {
      const response = await client.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [{ text: `Professional food photography of ${prompt}, studio lighting, 4k, delicious, isolated on simple background.` }]
        },
        config: {
          imageConfig: {
             imageSize: size,
             aspectRatio: "1:1"
          }
        }
      });
      
      for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
              return `data:image/png;base64,${part.inlineData.data}`;
          }
      }
      return null;
    } catch (error) {
      console.error("Image generation failed:", error);
      throw error;
    }
  },

  /**
   * Generates a comprehensive detailed report for admin dashboard with sales analysis
   */
  generateDetailedReport: async (stats: QueueStats, canteenName: string, orderSummary?: { foodItem: string, count: number, totalPrepTime: number }[]): Promise<string> => {
    const client = getClient();
    
    if (!client) {
      console.warn("Gemini API not configured, returning basic report");
      return generateBasicReport(stats, canteenName, orderSummary);
    }

    const currentTime = new Date().toLocaleString();
    
    // Format order summary for the prompt
    let orderSummaryText = '';
    if (orderSummary && orderSummary.length > 0) {
      orderSummaryText = `
      
      TODAY'S FOOD ITEM SALES DATA:
      ${orderSummary.map((item, idx) => 
        `- ${idx + 1}. ${item.foodItem}: ${item.count} orders sold, Total prep time: ${item.totalPrepTime} minutes`
      ).join('\n')}
      
      Best Selling Item: ${orderSummary[0].foodItem} with ${orderSummary[0].count} orders`;
    }
    
    const prompt = `
      You are a professional business analyst for a university canteen management system.
      
      Generate a COMPREHENSIVE and DETAILED admin report based on this data:
      
      CANTEEN INFORMATION:
      - Canteen Name: ${canteenName}
      - Report Generated: ${currentTime}
      
      TODAY'S PERFORMANCE METRICS:
      - Total Orders Processed: ${stats.totalOrdersToday}
      - Average Wait Time: ${stats.averageWaitTime} minutes
      - Currently Active Queue: ${stats.activeQueueLength} orders
      - Peak Hour: ${stats.peakHour}${orderSummaryText}
      
      ANALYSIS SECTIONS TO INCLUDE (MUST INCLUDE DETAILED ANALYSIS OF SALES DATA):
      
      1. EXECUTIVE SUMMARY
      - Brief overview of today's performance
      - Key metrics at a glance
      - Highlight of best-selling item performance
      
      2. SALES PERFORMANCE ANALYSIS
      - Detailed analysis of best-selling food items
      - Food item demand patterns
      - Average preparation time insights
      - Which items had highest throughput
      - Customer preference trends based on sales data
      
      3. OPERATIONAL EFFICIENCY ANALYSIS
      - Wait time analysis and trends
      - Queue efficiency assessment
      - Order volume assessment relative to capacity
      - Peak hour impact and management
      - Staff performance indicators
      
      4. DETAILED RECOMMENDATIONS (BASED ON ACTUAL SALES DATA)
      - 5-7 specific, data-driven recommendations to improve efficiency
      - Recommendations for best-selling item preparation (more stock, faster lines, etc.)
      - Suggestions for slow-moving items (promotions, menu changes, etc.)
      - Cost-saving opportunities based on real sales patterns
      - Process optimization suggestions with rationale
      - Staffing adjustments needed based on item preparation times
      
      5. SALES FORECASTING
      - Predicted demand for next shift based on today's patterns
      - Recommended inventory levels for each food item
      - Projected prep time requirements
      - Staffing levels needed
      - Expected peak hours
      
      6. CRITICAL ALERTS & ACTION ITEMS
      - Any concerning metrics requiring immediate action
      - Items that need immediate attention or menu changes
      - Areas requiring immediate staff intervention
      
      IMPORTANT INSTRUCTIONS:
      - ALL RECOMMENDATIONS AND ANALYSIS MUST BE DATA-DRIVEN AND BASED ON THE ACTUAL SALES DATA PROVIDED
      - DO NOT MAKE UP OR ASSUME INFORMATION NOT PROVIDED
      - Every suggestion must reference specific data points (item names, counts, times)
      - Use clear section headers with === 
      - Use bullet points for lists
      - Use numbered lists for recommendations
      - Include specific metrics and numbers in the analysis
      - Make it professional and actionable
      - Target audience: Canteen Manager/Admin
      - Provide detailed, specific suggestions that can be immediately implemented
      
      Generate a detailed, professional report now with emphasis on sales analysis and data-driven insights:
    `;

    try {
      const response = await client.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
      });
      
      const reportText = response.text || generateBasicReport(stats, canteenName, orderSummary);
      return formatReportForDisplay(reportText);
    } catch (error) {
      console.error("Detailed report generation failed:", error);
      return generateBasicReport(stats, canteenName, orderSummary);
    }
  }
};

/**
 * Fallback basic report generator
 */
function generateBasicReport(stats: QueueStats, canteenName: string, orderSummary?: { foodItem: string, count: number, totalPrepTime: number }[]): string {
  const currentTime = new Date().toLocaleString();
  
  let reportContent = `
CANTEEN DAILY REPORT
${'='.repeat(60)}

Canteen: ${canteenName}
Generated: ${currentTime}

PERFORMANCE METRICS
${'-'.repeat(60)}
• Total Orders Today: ${stats.totalOrdersToday}
• Average Wait Time: ${stats.averageWaitTime} minutes
• Active Queue Length: ${stats.activeQueueLength}
• Peak Hour: ${stats.peakHour}`;

  if (orderSummary && orderSummary.length > 0) {
    reportContent += `

SALES PERFORMANCE
${'-'.repeat(60)}
• Best Selling Item: ${orderSummary[0].foodItem} (${orderSummary[0].count} orders)

Sales Breakdown by Item:`;
    orderSummary.forEach((item, idx) => {
      reportContent += `
  ${idx + 1}. ${item.foodItem}: ${item.count} orders, Avg prep time: ${Math.round(item.totalPrepTime / item.count)} minutes`;
    });
  }

  reportContent += `

EFFICIENCY ASSESSMENT
${'-'.repeat(60)}
• Orders Per Hour: ${Math.round(stats.totalOrdersToday / 8)}
• Queue Status: ${stats.activeQueueLength > 10 ? 'HIGH' : stats.activeQueueLength > 5 ? 'MODERATE' : 'LOW'}
• Average Service Time: ${stats.averageWaitTime} minutes per order

QUICK INSIGHTS
${'-'.repeat(60)}
• Overall Performance: ${stats.averageWaitTime < 10 ? 'Excellent' : stats.averageWaitTime < 15 ? 'Good' : 'Needs Improvement'}
• Recommended Action: ${stats.activeQueueLength > 10 ? 'Add more staff' : 'Current staffing is adequate'}
• Next Steps: Monitor queue during ${stats.peakHour}`;

  if (orderSummary && orderSummary.length > 0) {
    reportContent += `
• Focus on: Prepare more ${orderSummary[0].foodItem} for next shift due to high demand`;
  }

  reportContent += `

Report Generated by SmartQueue System
`;
  return reportContent;
}

/**
 * Format report for nice display
 */
function formatReportForDisplay(report: string): string {
  return report
    .replace(/^# /gm, '# ')
    .replace(/\n\n/g, '\n')
    .trim();}