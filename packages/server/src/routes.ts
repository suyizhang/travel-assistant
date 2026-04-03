import type http from "node:http";
import { config } from "./config.ts";
import { authenticate, wxCode2Session, githubOAuth, generateToken } from "./auth.ts";
import { checkRateLimit, getClientIP, parseBody, getCorsHeaders, sendJSON } from "./middleware.ts";
import { Assistant } from "./agent.ts";
import { streamChat, clearStreamSession } from "./stream.ts";
import { getAttractionReviews, addUserReview, markReviewHelpful, getAllReviews, getUserReviewStats } from "./tools/data/reviews-data.js";

const assistant = new Assistant();

// ===================== 游客每日限制 =====================
const GUEST_DAILY_LIMIT = 5;
const guestUsageMap = new Map<string, { count: number; date: string }>();

function checkGuestLimit(guestId: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let record = guestUsageMap.get(guestId);

  if (!record || record.date !== today) {
    record = { count: 0, date: today };
    guestUsageMap.set(guestId, record);
  }

  if (record.count >= GUEST_DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: GUEST_DAILY_LIMIT - record.count };
}

// 每小时清理过期的游客记录
setInterval(() => {
  const today = new Date().toISOString().slice(0, 10);
  for (const [id, record] of guestUsageMap) {
    if (record.date !== today) guestUsageMap.delete(id);
  }
}, 60 * 60 * 1000);

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

  const isGuest = userId.startsWith("guest:");

  // 用户级频率限制
  if (userId !== "dev" && userId !== "apikey") {
    if (!checkRateLimit(`user:${userId}`)) {
      sendJSON(res, 429, { error: "请求过于频繁，请稍后再试" }, corsHeaders);
      return;
    }
  }

  // POST /api/chat
  if (method === "POST" && url === "/api/chat") {
    // 游客每日限制
    if (isGuest) {
      const { allowed } = checkGuestLimit(userId);
      if (!allowed) {
        sendJSON(res, 403, {
          error: `游客每日免费体验 ${GUEST_DAILY_LIMIT} 次已用完，登录后可无限使用`,
          guest_limit: true,
        }, corsHeaders);
        return;
      }
    }

    try {
      const { message, session_id, location } = await parseBody(req);

      if (!message || typeof message !== "string") {
        sendJSON(res, 400, { error: "缺少 message 参数" }, corsHeaders);
        return;
      }
      if (message.length > config.security.maxMessageLength) {
        sendJSON(res, 400, { error: `消息过长，请控制在 ${config.security.maxMessageLength} 字以内` }, corsHeaders);
        return;
      }

      const sessionId = session_id || userId;
      const reply = await assistant.chat(message, sessionId, location || undefined);
      sendJSON(res, 200, { reply, session_id: sessionId }, corsHeaders);
    } catch (err) {
      console.error("Chat error:", err);
      sendJSON(res, 500, { error: "服务处理异常，请稍后重试" }, corsHeaders);
    }
    return;
  }

  // POST /api/chat/stream
  if (method === "POST" && url === "/api/chat/stream") {
    // 游客每日限制
    if (isGuest) {
      const { allowed } = checkGuestLimit(userId);
      if (!allowed) {
        sendJSON(res, 403, {
          error: `游客每日免费体验 ${GUEST_DAILY_LIMIT} 次已用完，登录后可无限使用`,
          guest_limit: true,
        }, corsHeaders);
        return;
      }
    }

    try {
      const { message, session_id, location } = await parseBody(req);

      if (!message || typeof message !== "string") {
        sendJSON(res, 400, { error: "缺少 message 参数" }, corsHeaders);
        return;
      }
      if (message.length > config.security.maxMessageLength) {
        sendJSON(res, 400, { error: `消息过长，请控制在 ${config.security.maxMessageLength} 字以内` }, corsHeaders);
        return;
      }

      const sessionId = session_id || userId;
      await streamChat(res, message, sessionId, corsHeaders, location || undefined);
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
      const sid = session_id || userId;
      assistant.clearHistory(sid);
      clearStreamSession(sid);
      sendJSON(res, 200, { message: "会话已清除" }, corsHeaders);
    } catch (err) {
      sendJSON(res, 500, { error: "操作失败" }, corsHeaders);
    }
    return;
  }

  // ========== 评价 API ==========

  // 辅助函数：解析URL路径（移除查询参数）
  const parsePath = (urlStr: string | undefined): string => {
    if (!urlStr) return ''
    return urlStr.split('?')[0]
  }

  const path = parsePath(url)

  // GET /api/reviews/:city/:attraction - 获取景点评价
  if (method === "GET" && path.startsWith('/api/reviews/')) {
    try {
      const parts = path.split('/')
      if (parts.length !== 5) {
        sendJSON(res, 400, { error: "无效的路径" }, corsHeaders);
        return;
      }
      const [_, _api, _reviews, 城市, 景点] = parts;
      const decodedCity = decodeURIComponent(城市);
      const decodedAttraction = decodeURIComponent(景点);

      const stats = getAttractionReviews(decodedCity, decodedAttraction);
      if (!stats) {
        sendJSON(res, 404, { error: "暂无该景点的口碑数据" }, corsHeaders);
        return;
      }

      sendJSON(res, 200, stats, corsHeaders);
    } catch (err) {
      console.error("Get reviews error:", err);
      sendJSON(res, 500, { error: "获取评价失败" }, corsHeaders);
    }
    return;
  }

  // POST /api/reviews - 提交新评价
  if (method === "POST" && path === "/api/reviews") {
    try {
      const { 城市, 景点, 评分, 内容, 匿名, 标签 } = await parseBody(req);

      if (!城市 || !景点 || !内容) {
        sendJSON(res, 400, { error: "缺少必要参数" }, corsHeaders);
        return;
      }
      if (!评分 || 评分 < 1 || 评分 > 5) {
        sendJSON(res, 400, { error: "评分必须在1-5之间" }, corsHeaders);
        return;
      }
      if (内容.length < 5 || 内容.length > 500) {
        sendJSON(res, 400, { error: "评价内容长度为5-500字" }, corsHeaders);
        return;
      }

      const review = addUserReview(
        城市,
        景点,
        评分,
        内容,
        userId,
        匿名 !== false, // 默认匿名
        标签
      );

      if (!review) {
        sendJSON(res, 500, { error: "提交评价失败" }, corsHeaders);
        return;
      }

      console.log(`[提交评价] 用户 ${userId.slice(0, 8)}*** 提交了 ${城市} · ${景点} 的评价`);
      sendJSON(res, 201, {
        id: review.id,
        message: "评价提交成功"
      }, corsHeaders);
    } catch (err) {
      console.error("Submit review error:", err);
      sendJSON(res, 500, { error: "提交评价失败" }, corsHeaders);
    }
    return;
  }

  // POST /api/reviews/:id/helpful - 标记评价为有用
  if (method === "POST" && path.startsWith('/api/reviews/') && path.endsWith('/helpful')) {
    try {
      const reviewId = path.split('/')[3];
      if (!reviewId) {
        sendJSON(res, 400, { error: "无效的评价ID" }, corsHeaders);
        return;
      }

      const success = markReviewHelpful(reviewId, userId);
      if (!success) {
        sendJSON(res, 400, { error: "标记失败，可能已经标记过或评价不存在" }, corsHeaders);
        return;
      }

      sendJSON(res, 200, { message: "已标记为有用" }, corsHeaders);
    } catch (err) {
      console.error("Mark helpful error:", err);
      sendJSON(res, 500, { error: "操作失败" }, corsHeaders);
    }
    return;
  }

  // GET /api/reviews/user - 获取当前用户的评价历史
  if (method === "GET" && path === "/api/reviews/user") {
    try {
      const allReviews = getAllReviews();
      const userReviews = allReviews.filter(r => r.用户标识 === userId);

      sendJSON(res, 200, { 评价数: userReviews.length, 评价列表: userReviews }, corsHeaders);
    } catch (err) {
      console.error("Get user reviews error:", err);
      sendJSON(res, 500, { error: "获取用户评价失败" }, corsHeaders);
    }
    return;
  }

  // 获取用户评价统计（内部使用，可加权限控制）
  if (method === "GET" && path === "/api/reviews/stats") {
    try {
      const stats = getUserReviewStats();
      sendJSON(res, 200, stats, corsHeaders);
    } catch (err) {
      console.error("Get stats error:", err);
      sendJSON(res, 500, { error: "获取统计失败" }, corsHeaders);
    }
    return;
  }

  sendJSON(res, 404, { error: "Not Found" }, corsHeaders);
}
