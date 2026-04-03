import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { weatherData } from "./data/weather-data.ts";

/**
 * 从 wttr.in 获取实时天气（免费，无需 API key）
 */
async function fetchLiveWeather(city: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(city);
    const resp = await fetch(`https://wttr.in/${encoded}?format=j1&lang=zh`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return null;

    const data = await resp.json() as any;
    const current = data?.current_condition?.[0];
    if (!current) return null;

    const tempC = current.temp_C;
    const feelsLike = current.FeelsLikeC;
    const humidity = current.humidity;
    const desc = current.lang_zh?.[0]?.value || current.weatherDesc?.[0]?.value || "";
    const windSpeed = current.windspeedKmph;

    // 提取未来 3 天预报
    const forecasts = (data.weather || []).slice(0, 3).map((day: any) => {
      const date = day.date;
      const maxT = day.maxtempC;
      const minT = day.mintempC;
      const dayDesc = day.hourly?.[4]?.lang_zh?.[0]?.value || day.hourly?.[4]?.weatherDesc?.[0]?.value || "";
      return `${date}：${dayDesc}，${minT}~${maxT}°C`;
    });

    let result = `实时天气：${desc}，气温 ${tempC}°C（体感 ${feelsLike}°C），湿度 ${humidity}%，风速 ${windSpeed}km/h`;
    if (forecasts.length > 0) {
      result += `\n未来天气：\n${forecasts.join("\n")}`;
    }
    return result;
  } catch (err: any) {
    console.error(`[Weather API] ${city} 查询失败:`, err.message);
    return null;
  }
}

export const weatherTool = tool(
  async ({ city, date }) => {
    const localInfo = weatherData[city];
    const dateHint = date ? `\n出行日期 ${date} 附近` : "";

    // 尝试获取实时天气
    const liveWeather = await fetchLiveWeather(city);

    if (localInfo && liveWeather) {
      // 本地气候概况 + 实时天气双重数据
      return `🌤️ ${city} 天气信息：\n\n📊 实时天气：\n${liveWeather}${dateHint}\n\n📖 气候概况：\n${localInfo}\n\n💡 出发前建议查看实时天气预报，合理准备衣物。`;
    }

    if (liveWeather) {
      // 仅有实时天气（未覆盖城市）
      return `🌤️ ${city} 天气信息：\n\n📊 ${liveWeather}${dateHint}\n\n💡 出发前建议持续关注天气变化，合理准备衣物。`;
    }

    if (localInfo) {
      // 仅有本地数据（API 不可用时的降级）
      return `🌤️ ${city} 旅行天气参考：\n${localInfo}${dateHint}\n\n💡 出发前建议查看实时天气预报，合理准备衣物。`;
    }

    // 都没有
    return `🌤️ ${city}：暂无详细天气数据，建议查阅当地近期天气预报。${dateHint}\n\n💡 出发前建议查看实时天气预报，合理准备衣物。`;
  },
  {
    name: "get_destination_weather",
    description: "查询旅行目的地的天气和气候信息，帮助用户决定出行时间和穿着。支持全球任意城市的实时天气查询。",
    schema: z.object({
      city: z.string().describe("目的地城市名称"),
      date: z.string().optional().describe("计划出行日期，如：2026-03-15"),
    }),
  }
);
