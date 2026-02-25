import http from "node:http";
import { config } from "./config.ts";
import { handleRequest } from "./routes.ts";

const server = http.createServer(handleRequest);

server.listen(config.port, () => {
  console.log(`\n🚀 旅伴 API 已启动: http://localhost:${config.port}`);
  console.log(`\n安全配置:`);
  console.log(`  微信登录: ${config.wx.appid ? "✅ 已配置" : "⚠️ 未配置"}`);
  console.log(`  API Key: ${config.auth.apiKey ? "✅ 已启用（调试用）" : "⚠️ 未配置"}`);
  console.log(`  Token 有效期: ${config.auth.tokenExpireMs / 3600000}h`);
  console.log(`  CORS: ${config.security.allowedOrigins.length > 0 ? `✅ 白名单 ${config.security.allowedOrigins.join(", ")}` : "⚠️ 未配置，允许所有来源"}`);
  console.log(`  频率限制: ${config.security.rateLimitPerMinute} 次/分钟/用户`);
  console.log(`\n接口列表:`);
  console.log(`  POST /api/login       — 微信登录（换 token）`);
  console.log(`  POST /api/chat        — 对话`);
  console.log(`  POST /api/chat/stream — 流式对话 (SSE)`);
  console.log(`  POST /api/clear       — 清除会话`);
  console.log(`  GET  /api/health      — 健康检查\n`);
});
