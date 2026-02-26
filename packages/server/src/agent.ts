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
6. **口碑查询** — 使用 get_attraction_reviews 工具查询景点的用户真实评价
7. **旅行建议** — 签证、交通、住宿、美食、安全等实用建议

## 交互风格
- 用中文回答，语气热情友好，像朋友聊天一样
- 回答简洁实用，适合在手机上阅读
- 主动追问用户的偏好和需求，不要一次性输出太多信息
- 当用户提到目的地时，主动调用工具获取天气、景点、口碑等信息
- 给建议时注明实用 tips（省钱技巧、避坑指南等）

## 关于口碑评价
- 当推荐景点时，使用 get_attraction_reviews 工具获取用户真实评价
- 在回复中简洁展示口碑信息，如「💬 X位用户推荐 ⭐X.X」
- 如果评价中有实用的避坑或建议，可以适当引用
- 鼓励用户查看详细评价：「点击[查看评价]可以看到更多真实体验」

## 对话策略
- 用户说想旅行但没确定目的地 → 先问预算、时间、偏好，再推荐
- 用户确定了目的地 → 依次提供天气、景点、口碑、行程、预算
- 用户问具体问题 → 直接回答，必要时调用工具辅助
- 如果有用户定位信息，在推荐行程时以用户所在城市为出发地，主动给出交通方式（飞机/高铁/自驾）和大致耗时`;

interface Session {
  history: BaseMessage[];
  summary: string;
  lastActiveAt: number;
}

// 当历史超过此值时，触发摘要压缩
const SUMMARIZE_THRESHOLD = 10;
// 压缩后保留最近的消息条数
const KEEP_RECENT = 4;
// 会话过期时间
const SESSION_TTL = 2 * 60 * 60 * 1000;
// 粗估 token 上限（模型 94208，留 12000 给输出 + system prompt）
const MAX_INPUT_TOKENS = 70000;
// 粗估：1 个中文字符 ≈ 2 tokens
const CHARS_PER_TOKEN = 1.5;

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
   * 粗估消息列表的 token 数
   */
  private estimateTokens(messages: BaseMessage[]): number {
    let chars = 0;
    for (const m of messages) {
      const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
      chars += content.length;
    }
    return Math.ceil(chars / CHARS_PER_TOKEN);
  }

  /**
   * 硬截断：如果消息 token 超限，从头部移除旧消息直到安全
   */
  private truncateToFit(messages: BaseMessage[]): BaseMessage[] {
    while (messages.length > 1 && this.estimateTokens(messages) > MAX_INPUT_TOKENS) {
      // 移除最早的一条（跳过 system 消息）
      const idx = messages.findIndex((m) => m._getType() !== "system");
      if (idx === -1) break;
      messages.splice(idx, 1);
    }
    return messages;
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
  private buildMessages(session: Session, location?: { latitude: number; longitude: number; city?: string }): BaseMessage[] {
    const messages: BaseMessage[] = [];

    // 如果有历史摘要，作为上下文注入
    if (session.summary) {
      messages.push(
        new SystemMessage(`以下是之前对话的摘要：\n${session.summary}`)
      );
    }

    // 如果有用户定位信息，注入上下文
    if (location) {
      const locParts: string[] = [];
      if (location.city) {
        locParts.push(`城市：${location.city}`);
      }
      locParts.push(`坐标：${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
      messages.push(
        new SystemMessage(
          `用户当前位置信息：${locParts.join("，")}。在推荐行程时可参考用户所在城市作为出发地，给出交通方式和大致耗时建议。`
        )
      );
    }

    messages.push(...session.history);
    return messages;
  }

  async chat(
    userInput: string,
    sessionId = "default",
    location?: { latitude: number; longitude: number; city?: string }
  ): Promise<string> {
    if (!this.initialized) {
      await this.init();
    }

    this.cleanExpiredSessions();
    const session = this.getSession(sessionId);

    session.history.push(new HumanMessage(userInput));

    // 超过阈值时先压缩历史
    await this.compressHistory(session);

    // 构建消息并确保不超限
    let inputMessages = this.buildMessages(session, location);
    inputMessages = this.truncateToFit(inputMessages);

    const estimatedTokens = this.estimateTokens(inputMessages);
    console.log(`[Token] 预估输入 ~${estimatedTokens} tokens, 消息数 ${inputMessages.length}`);

    try {
      const response = await this.agent.invoke({
        messages: inputMessages,
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
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      // 如果是 token 超限错误，强制压缩后重试一次
      if (errMsg.includes("maximum context length") || errMsg.includes("token")) {
        console.warn("[Token] 超限，强制压缩重试...");
        // 强制压缩：只保留最近 2 条
        session.history = session.history.slice(-2);
        session.summary = "";

        let retryMessages = this.buildMessages(session, location);
        retryMessages = this.truncateToFit(retryMessages);

        const retryResponse = await this.agent.invoke({
          messages: retryMessages,
        });

        const retryMsgs: BaseMessage[] = retryResponse.messages;
        const retryAI = retryMsgs
          .filter(
            (m: BaseMessage) =>
              m._getType() === "ai" &&
              typeof m.content === "string" &&
              m.content.length > 0
          )
          .pop();

        const reply = retryAI
          ? (retryAI.content as string)
          : "抱歉，对话过长，请清除会话后重试。";

        session.history.push(new AIMessage(reply));
        return reply;
      }
      throw err;
    }
  }

  clearHistory(sessionId = "default") {
    this.sessions.delete(sessionId);
  }
}
