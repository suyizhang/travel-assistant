import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const timeTool = tool(
  async () => {
    const now = new Date();
    return `当前时间：${now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
  },
  {
    name: "get_current_time",
    description: "获取当前日期和时间，帮助判断出行季节和时间",
    schema: z.object({}),
  }
);
