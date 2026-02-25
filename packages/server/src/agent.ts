import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { config } from "./config.ts";
import { allTools } from "./tools/index.ts";

const SYSTEM_PROMPT = `你是一位经验丰富的专业旅行规划师，名叫「旅伴」。你热爱旅行，去过世界各地，擅长为用户量身定制旅行方案。

## 你的能力
1. **目的地推荐** — 根据用户偏好（预算、时间、兴趣）推荐合适的目的地
2. **天气查询** — 使用 get_destination_weather 工具查询目的地气候，帮助决定出行时间和穿着
3. **景点推荐** — 使用 recommend_attractions 工具推荐热门景点，支持按偏好筛选
4. **行程规划** — 使用 plan_itinerary 工具生成详细的每日行程安排
5. **预算估算** — 使用 estimate_budget 工具估算旅行费用
6. **旅行建议** — 签证、交通、住宿、美食、安全等实用建议

## 交互风格
- 用中文回答，语气热情友好，像朋友聊天一样
- 回答简洁实用，适合在手机上阅读
- 主动追问用户的偏好和需求，不要一次性输出太多信息
- 当用户提到目的地时，主动调用工具获取天气、景点等信息
- 给建议时注明实用 tips（省钱技巧、避坑指南等）

## 对话策略
- 用户说想旅行但没确定目的地 → 先问预算、时间、偏好，再推荐
- 用户确定了目的地 → 依次提供天气、景点、行程、预算
- 用户问具体问题 → 直接回答，必要时调用工具辅助`;

interface Session {
  history: BaseMessage[];
  summary: string;
  lastActiveAt: number;
}

// 当历史超过此值时，触发摘要压缩
const SUMMARIZE_THRESHOLD = 20;
// 压缩后保留最近的消息条数
const KEEP_RECENT = 6;
// 会话过期时间
const SESSION_TTL = 2 * 60 * 60 * 1000;

export class Assistant {
  private agent: any;
  private summarizer: ChatOpenAI | null = null;
  private sessions = new Map<string, Session>();
  private initialized = false;

  async init() {
    const model = new ChatOpenAI({
      modelName: config.model.name,
      temperature: 0.7,
      configuration: {
        baseURL: config.model.baseURL,
      },
    });

    this.summarizer = new ChatOpenAI({
      modelName: config.model.name,
      temperature: 0,
      maxTokens: 500,
      configuration: {
        baseURL: config.model.baseURL,
      },
    });

    this.agent = createReactAgent({
      llm: model,
      tools: allTools,
      prompt: SYSTEM_PROMPT,
    });

    this.initialized = true;
  }

  private getSession(sessionId: string): Session {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = { history: [], summary: "", lastActiveAt: Date.now() };
      this.sessions.set(sessionId, session);
    }
    session.lastActiveAt = Date.now();
    return session;
  }

  private cleanExpiredSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActiveAt > SESSION_TTL) {
        this.sessions.delete(id);
      }
    }
  }

  /**
   * 将过长的历史压缩为摘要 + 最近几条消息
   * 这样无论聊了多久，发给模型的 token 量始终可控
   */
  private async compressHistory(session: Session) {
    if (session.history.length <= SUMMARIZE_THRESHOLD || !this.summarizer) {
      return;
    }

    // 要压缩的旧消息
    const toSummarize = session.history.slice(0, -KEEP_RECENT);
    // 保留的近期消息
    const recentMessages = session.history.slice(-KEEP_RECENT);

    // 构建摘要内容
    const conversationText = toSummarize
      .map((m) => {
        const role = m._getType() === "human" ? "用户" : "助手";
        return `${role}: ${m.content}`;
      })
      .join("\n");

    const prevSummary = session.summary
      ? `之前的摘要：${session.summary}\n\n`
      : "";

    const summaryResponse = await this.summarizer.invoke([
      new SystemMessage(
        "你是一个对话摘要助手。请将以下对话内容压缩为简洁的中文摘要，保留关键信息（用户偏好、重要事实、待办事项等），去掉寒暄和重复内容。摘要控制在 200 字以内。"
      ),
      new HumanMessage(
        `${prevSummary}新的对话内容：\n${conversationText}\n\n请生成摘要：`
      ),
    ]);

    session.summary =
      typeof summaryResponse.content === "string"
        ? summaryResponse.content
        : "";

    // 替换历史：摘要作为系统消息 + 最近消息
    session.history = recentMessages;

    console.log(
      `[摘要压缩] 将 ${toSummarize.length} 条消息压缩为摘要，保留最近 ${recentMessages.length} 条`
    );
  }

  /**
   * 构建发送给模型的消息列表
   */
  private buildMessages(session: Session): BaseMessage[] {
    const messages: BaseMessage[] = [];

    // 如果有历史摘要，作为上下文注入
    if (session.summary) {
      messages.push(
        new SystemMessage(`以下是之前对话的摘要：\n${session.summary}`)
      );
    }

    messages.push(...session.history);
    return messages;
  }

  async chat(userInput: string, sessionId = "default"): Promise<string> {
    if (!this.initialized) {
      await this.init();
    }

    this.cleanExpiredSessions();
    const session = this.getSession(sessionId);

    session.history.push(new HumanMessage(userInput));

    // 超过阈值时先压缩历史
    await this.compressHistory(session);

    const response = await this.agent.invoke({
      messages: this.buildMessages(session),
    });

    const messages: BaseMessage[] = response.messages;
    const lastAIMessage = messages
      .filter(
        (m: BaseMessage) =>
          m._getType() === "ai" &&
          typeof m.content === "string" &&
          m.content.length > 0
      )
      .pop();

    const reply = lastAIMessage
      ? (lastAIMessage.content as string)
      : "抱歉，我无法处理这个请求。";

    session.history.push(new AIMessage(reply));

    return reply;
  }

  clearHistory(sessionId = "default") {
    this.sessions.delete(sessionId);
  }
}
