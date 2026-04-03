import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import type http from "node:http";
import { config } from "./config.ts";
import { allTools } from "./tools/index.ts";

const STREAM_SYSTEM_PROMPT = `你是一位经验丰富的专业旅行规划师，名叫「旅伴」。你热爱旅行，去过世界各地，擅长为用户量身定制旅行方案。

## 你的能力
1. **目的地推荐** — 根据用户偏好（预算、时间、兴趣）推荐合适的目的地
2. **天气查询** — 使用 get_destination_weather 工具查询目的地气候
3. **景点推荐** — 使用 recommend_attractions 工具推荐热门景点
4. **行程规划** — 使用 plan_itinerary 工具生成详细的每日行程安排
5. **预算估算** — 使用 estimate_budget 工具估算旅行费用
6. **口碑查询** — 使用 get_attraction_reviews 工具查询景点的用户真实评价

## 交互风格
- 用中文回答，语气热情友好
- 回答简洁实用，适合在手机上阅读
- 主动追问用户的偏好和需求
- 当用户提到目的地时，主动调用工具获取信息`;

interface StreamSession {
  history: BaseMessage[];
  summary: string;
  lastActiveAt: number;
}

const streamSessions = new Map<string, StreamSession>();
const SESSION_TTL = 2 * 60 * 60 * 1000;
const MAX_STREAM_SESSIONS = 200;

let streamAgent: any = null;

async function getStreamAgent() {
  if (!streamAgent) {
    const model = new ChatOpenAI({
      modelName: config.model.name,
      temperature: 0.7,
      streaming: true,
      configuration: {
        baseURL: config.model.baseURL,
      },
    });

    streamAgent = createReactAgent({
      llm: model,
      tools: allTools,
      prompt: STREAM_SYSTEM_PROMPT,
    });
  }
  return streamAgent;
}

function getStreamSession(sessionId: string): StreamSession {
  let session = streamSessions.get(sessionId);
  if (!session) {
    session = { history: [], summary: "", lastActiveAt: Date.now() };
    streamSessions.set(sessionId, session);
  }
  session.lastActiveAt = Date.now();

  // 清理过期会话
  const now = Date.now();
  for (const [id, s] of streamSessions) {
    if (now - s.lastActiveAt > SESSION_TTL) {
      streamSessions.delete(id);
    }
  }

  // LRU 淘汰
  if (streamSessions.size > MAX_STREAM_SESSIONS) {
    const entries = [...streamSessions.entries()]
      .sort((a, b) => a[1].lastActiveAt - b[1].lastActiveAt);
    const toRemove = entries.slice(0, entries.length - MAX_STREAM_SESSIONS);
    for (const [id] of toRemove) {
      streamSessions.delete(id);
    }
  }

  return session;
}

export async function streamChat(
  res: http.ServerResponse,
  message: string,
  sessionId: string,
  corsHeaders: Record<string, string> = {},
  location?: { latitude: number; longitude: number; city?: string }
) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    ...corsHeaders,
  });

  const agent = await getStreamAgent();
  const session = getStreamSession(sessionId);

  // 添加用户消息到历史
  session.history.push(new HumanMessage(message));

  // 构建消息列表
  const inputMessages: BaseMessage[] = [];
  if (session.summary) {
    inputMessages.push(new SystemMessage(`以下是之前对话的摘要：\n${session.summary}`));
  }
  if (location) {
    const locParts: string[] = [];
    if (location.city) locParts.push(`城市：${location.city}`);
    locParts.push(`坐标：${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
    inputMessages.push(
      new SystemMessage(`用户当前位置信息：${locParts.join("，")}。在推荐行程时可参考用户所在城市作为出发地。`)
    );
  }
  inputMessages.push(...session.history);

  // 限制历史长度
  if (session.history.length > 10) {
    session.history = session.history.slice(-4);
  }

  let fullReply = "";

  try {
    const stream = await agent.streamEvents(
      { messages: inputMessages },
      { version: "v2" }
    );

    for await (const event of stream) {
      // 捕获 LLM 流式输出的 token
      if (
        event.event === "on_chat_model_stream" &&
        event.data?.chunk?.content
      ) {
        const text = typeof event.data.chunk.content === "string"
          ? event.data.chunk.content
          : "";
        if (text) {
          fullReply += text;
          res.write(`data: ${JSON.stringify({ type: "chunk", content: text })}\n\n`);
        }
      }
    }

    // 保存 AI 回复到历史
    if (fullReply) {
      session.history.push(new AIMessage(fullReply));
    }

    res.write(`data: ${JSON.stringify({ type: "done", content: fullReply })}\n\n`);
  } catch (err: any) {
    console.error("[Stream error]", err.message);
    res.write(`data: ${JSON.stringify({ type: "error", content: err.message || "服务异常" })}\n\n`);
  }

  res.end();
  return fullReply;
}

export function clearStreamSession(sessionId: string) {
  streamSessions.delete(sessionId);
}
