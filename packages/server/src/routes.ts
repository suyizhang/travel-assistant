import type http from "node:http";
import { config } from "./config.ts";
import { authenticate, wxCode2Session, githubOAuth, generateToken } from "./auth.ts";
import { checkRateLimit, getClientIP, parseBody, getCorsHeaders, sendJSON } from "./middleware.ts";
import { Assistant } from "./agent.ts";
import { streamChat } from "./stream.ts";

const assistant = new Assistant();

export async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
) {
  const { method, url } = req;
  const corsHeaders = getCorsHeaders(req);
  const clientIP = getClientIP(req);

  // CORS 预检
  if (method === "OPTIONS") {
    sendJSON(res, 204, {}, corsHeaders);
    return;
  }

  // 健康检查（无需鉴权）
  if (method === "GET" && url === "/api/health") {
    sendJSON(res, 200, { status: "ok", timestamp: new Date().toISOString() }, corsHeaders);
    return;
  }

  // ========== 微信登录（无需鉴权）==========
  if (method === "POST" && url === "/api/login") {
    if (!config.wx.appid || !config.wx.secret) {
      sendJSON(res, 500, { error: "微信登录未配置" }, corsHeaders);
      return;
    }

    if (!checkRateLimit(`login:${clientIP}`)) {
      sendJSON(res, 429, { error: "请求过于频繁" }, corsHeaders);
      return;
    }

    try {
      const { code } = await parseBody(req);
      if (!code || typeof code !== "string") {
        sendJSON(res, 400, { error: "缺少 code 参数" }, corsHeaders);
        return;
      }

      const wxResult = await wxCode2Session(code);
      if (!wxResult) {
        sendJSON(res, 401, { error: "微信登录失败，请重试" }, corsHeaders);
        return;
      }

      const token = generateToken(wxResult.openid);
      console.log(`[登录] 用户 ${wxResult.openid.slice(0, 8)}*** 登录成功`);
      sendJSON(res, 200, { token, expires_in: config.auth.tokenExpireMs / 1000 }, corsHeaders);
    } catch (err) {
      console.error("Login error:", err);
      sendJSON(res, 500, { error: "登录服务异常" }, corsHeaders);
    }
    return;
  }

  // ========== H5 GitHub 登录（无需鉴权）==========
  if (method === "POST" && url === "/api/login/h5") {
    if (!config.github.clientId || !config.github.clientSecret) {
      sendJSON(res, 500, { error: "GitHub 登录未配置" }, corsHeaders);
      return;
    }

    if (!checkRateLimit(`login:${clientIP}`)) {
      sendJSON(res, 429, { error: "请求过于频繁" }, corsHeaders);
      return;
    }

    try {
      const { code } = await parseBody(req);
      if (!code || typeof code !== "string") {
        sendJSON(res, 400, { error: "缺少 code 参数" }, corsHeaders);
        return;
      }

      const ghUser = await githubOAuth(code);
      if (!ghUser) {
        sendJSON(res, 401, { error: "GitHub 授权失败，请重试" }, corsHeaders);
        return;
      }

      const token = generateToken(`gh:${ghUser.id}`);
      console.log(`[H5登录] GitHub 用户 ${ghUser.login} 登录成功`);
      sendJSON(res, 200, {
        token,
        expires_in: config.auth.tokenExpireMs / 1000,
        user: { login: ghUser.login, avatar_url: ghUser.avatar_url },
      }, corsHeaders);
    } catch (err) {
      console.error("H5 Login error:", err);
      sendJSON(res, 500, { error: "登录服务异常" }, corsHeaders);
    }
    return;
  }

  // ========== 以下接口需要鉴权 ==========

  if (!checkRateLimit(clientIP)) {
    console.warn(`[安全] 频率限制触发: ${clientIP}`);
    sendJSON(res, 429, { error: "请求过于频繁，请稍后再试" }, corsHeaders);
    return;
  }

  const userId = authenticate(req);
  if (!userId) {
    console.warn(`[安全] 鉴权失败: ${clientIP}`);
    sendJSON(res, 401, { error: "未授权，请先登录" }, corsHeaders);
    return;
  }

  // 用户级频率限制
  if (userId !== "dev" && userId !== "apikey") {
    if (!checkRateLimit(`user:${userId}`)) {
      sendJSON(res, 429, { error: "请求过于频繁，请稍后再试" }, corsHeaders);
      return;
    }
  }

  // POST /api/chat
  if (method === "POST" && url === "/api/chat") {
    try {
      const { message, session_id } = await parseBody(req);

      if (!message || typeof message !== "string") {
        sendJSON(res, 400, { error: "缺少 message 参数" }, corsHeaders);
        return;
      }
      if (message.length > config.security.maxMessageLength) {
        sendJSON(res, 400, { error: `消息过长，请控制在 ${config.security.maxMessageLength} 字以内` }, corsHeaders);
        return;
      }

      const sessionId = session_id || userId;
      const reply = await assistant.chat(message, sessionId);
      sendJSON(res, 200, { reply, session_id: sessionId }, corsHeaders);
    } catch (err) {
      console.error("Chat error:", err);
      sendJSON(res, 500, { error: "服务处理异常，请稍后重试" }, corsHeaders);
    }
    return;
  }

  // POST /api/chat/stream
  if (method === "POST" && url === "/api/chat/stream") {
    try {
      const { message, session_id } = await parseBody(req);

      if (!message || typeof message !== "string") {
        sendJSON(res, 400, { error: "缺少 message 参数" }, corsHeaders);
        return;
      }
      if (message.length > config.security.maxMessageLength) {
        sendJSON(res, 400, { error: `消息过长，请控制在 ${config.security.maxMessageLength} 字以内` }, corsHeaders);
        return;
      }

      const sessionId = session_id || userId;
      await streamChat(res, message, [], corsHeaders);
    } catch (err) {
      console.error("Stream error:", err);
      if (!res.headersSent) {
        sendJSON(res, 500, { error: "服务处理异常，请稍后重试" }, corsHeaders);
      }
    }
    return;
  }

  // POST /api/clear
  if (method === "POST" && url === "/api/clear") {
    try {
      const { session_id } = await parseBody(req);
      assistant.clearHistory(session_id || userId);
      sendJSON(res, 200, { message: "会话已清除" }, corsHeaders);
    } catch (err) {
      sendJSON(res, 500, { error: "操作失败" }, corsHeaders);
    }
    return;
  }

  sendJSON(res, 404, { error: "Not Found" }, corsHeaders);
}
