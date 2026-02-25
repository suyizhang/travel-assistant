import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { attractionsData } from "./data/attractions-data.ts";

export const attractionTool = tool(
  async ({ city, preference }) => {
    const cityAttractions = attractionsData[city];
    if (!cityAttractions) {
      return `暂无 ${city} 的详细景点数据，建议搜索「${city} 必去景点」获取最新推荐。一般建议关注：当地地标建筑、特色美食街、自然风光和文化遗产。`;
    }

    let filtered = cityAttractions;
    if (preference) {
      const prefLower = preference.toLowerCase();
      const matched = cityAttractions.filter((a) =>
        a.type.includes(prefLower) || a.desc.includes(prefLower) || a.name.includes(prefLower)
      );
      if (matched.length > 0) filtered = matched;
    }

    const list = filtered
      .map((a, i) => `${i + 1}. **${a.name}**（${a.type}）\n   ${a.desc}\n   ⏱️ ${a.time} | 💰 ${a.cost}`)
      .join("\n\n");

    return `🏛️ ${city} 景点推荐：\n\n${list}`;
  },
  {
    name: "recommend_attractions",
    description: "推荐旅行目的地的热门景点，支持按偏好筛选（如文化、美食、自然、购物等）",
    schema: z.object({
      city: z.string().describe("目的地城市名称"),
      preference: z.string().optional().describe("偏好类型，如：文化、美食、自然、购物、休闲"),
    }),
  }
);
