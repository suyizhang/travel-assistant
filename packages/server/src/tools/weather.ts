import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { weatherData } from "./data/weather-data.ts";

export const weatherTool = tool(
  async ({ city, date }) => {
    const info = weatherData[city] || `${city}：建议查阅当地近期天气预报获取详细信息。`;
    const dateHint = date ? `\n出行日期 ${date} 附近` : "";
    return `🌤️ ${city} 旅行天气参考：\n${info}${dateHint}\n\n💡 出发前建议查看实时天气预报，合理准备衣物。`;
  },
  {
    name: "get_destination_weather",
    description: "查询旅行目的地的天气和气候信息，帮助用户决定出行时间和穿着",
    schema: z.object({
      city: z.string().describe("目的地城市名称"),
      date: z.string().optional().describe("计划出行日期，如：2026-03-15"),
    }),
  }
);
