import type http from "node:http";
import { config } from "./config.ts";

// ===================== 频率限制 =====================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitMap) {
    if (now > data.resetTime) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  let record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + 60_000 };
    rateLimitMap.set(key, record);
  }

  record.count++;
  return record.count <= config.security.rateLimitPerMinute;
}

// ===================== 请求解析 =====================

export function getClientIP(req: http.IncomingMessage): string {
  const realIP = req.headers["x-real-ip"];
  if (typeof realIP === "string") return realIP.trim();

  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();

  return req.socket.remoteAddress || "unknown";
}

export function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > config.security.maxBodySize) {
        req.destroy();
        reject(new Error("请求体过大"));
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8").trim();
      if (!raw) { resolve({}); return; }
      try { resolve(JSON.parse(raw)); return; } catch { /* non-JSON */ }
      try {
        const params = new URLSearchParams(raw);
        const obj: Record<string, string> = {};
        for (const [key, value] of params) obj[key] = value;
        if (Object.keys(obj).length > 0) { resolve(obj); return; }
      } catch { /* ignore */ }
      reject(new Error("无效的请求格式"));
    });

    req.on("error", reject);
  });
}

// ===================== CORS =====================

export function getCorsHeaders(req: http.IncomingMessage): Record<string, string> {
  const origin = req.headers["origin"] || "";
  const { allowedOrigins } = config.security;

  if (allowedOrigins.length === 0) {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
  }

  if (allowedOrigins.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      Vary: "Origin",
    };
  }

  return {};
}

// ===================== 响应 =====================

export function sendJSON(
  res: http.ServerResponse,
  statusCode: number,
  data: Record<string, any>,
  corsHeaders: Record<string, string> = {}
) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...corsHeaders,
  });
  res.end(JSON.stringify(data));
}
