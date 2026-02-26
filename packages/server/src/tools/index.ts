import { weatherTool } from "./weather.ts";
import { attractionTool } from "./attractions.ts";
import { budgetTool } from "./budget.ts";
import { itineraryTool } from "./itinerary.ts";
import { timeTool } from "./time.ts";
import { reviewTool, reviewSummaryTool } from "./review-tool.ts";

export { weatherTool, attractionTool, budgetTool, itineraryTool, timeTool, reviewTool, reviewSummaryTool };
export const allTools = [weatherTool, attractionTool, budgetTool, itineraryTool, timeTool, reviewTool, reviewSummaryTool];
