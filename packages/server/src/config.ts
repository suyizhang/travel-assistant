import "dotenv/config";
import process from "node:process";
import crypto from "node:crypto";

export const config = {
  // 服务端口
  port: Number(process.env.PORT) || 3000,

  // 模型配置
  model: {
    name: process.env.MODEL_NAME || "gpt-4o-mini",
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  },

  // 微信小程序
  wx: {
    appid: process.env.WX_APPID || "",
    secret: process.env.WX_SECRET || "",
  },

  // GitHub OAuth（H5 登录）
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
  },

  // 鉴权
  auth: {
    apiKey: process.env.API_KEY || "",
    tokenSecret: process.env.TOKEN_SECRET || crypto.randomBytes(32).toString("hex"),
    tokenExpireMs: Number(process.env.TOKEN_EXPIRE_HOURS || 168) * 60 * 60 * 1000,
  },

  // 安全
  security: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean),
    rateLimitPerMinute: Number(process.env.RATE_LIMIT) || 30,
    maxBodySize: 10 * 1024,  // 10KB
    maxMessageLength: 2000,
  },
} as const;
