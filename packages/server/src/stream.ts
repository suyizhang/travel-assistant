import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import type http from "node:http";
import { config } from "./config.ts";

// 复用 model 实例，避免每次请求都创建
let streamModel: ChatOpenAI | null = null;

function getStreamModel(): ChatOpenAI {
  if (!streamModel) {
    streamModel = new ChatOpenAI({
      modelName: config.model.name,
      temperature: 0.7,
      streaming: true,
      configuration: {
        baseURL: config.model.baseURL,
      },
    });
  }
  return streamModel;
}

export async function streamChat(
  res: http.ServerResponse,
  message: string,
  history: BaseMessage[],
  corsHeaders: Record<string, string> = {}
) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    ...corsHeaders,
  });

  const model = getStreamModel();
  let fullReply = "";

  try {
    const stream = await model.stream([...history, new HumanMessage(message)]);

    for await (const chunk of stream) {
      const text = typeof chunk.content === "string" ? chunk.content : "";
      if (text) {
        fullReply += text;
        res.write(`data: ${JSON.stringify({ type: "chunk", content: text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done", content: fullReply })}\n\n`);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ type: "error", content: err.message })}\n\n`);
  }

  res.end();
  return fullReply;
}
