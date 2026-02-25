import crypto from "node:crypto";
import type http from "node:http";
import { config } from "./config.ts";

// token 存储：token -> { openid, expiresAt }
const tokenStore = new Map<string, { openid: string; expiresAt: number }>();

// 定期清理过期 token
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenStore) {
    if (now > data.expiresAt) tokenStore.delete(token);
  }
}, 5 * 60 * 1000);

/**
 * 调用微信 code2Session 接口，用 code 换取 openid
 */
export async function wxCode2Session(code: string): Promise<{ openid: string; session_key: string } | null> {
  const { appid, secret } = config.wx;
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;

  try {
    const resp = await fetch(url);
    const data = await resp.json() as any;

    if (data.errcode) {
      console.error(`[微信] code2Session 失败: ${data.errcode} ${data.errmsg}`);
      return null;
    }

    return { openid: data.openid, session_key: data.session_key };
  } catch (err) {
    console.error("[微信] code2Session 请求异常:", err);
    return null;
  }
}

/**
 * GitHub OAuth：用 code 换取 access_token，再获取用户信息
 */
export async function githubOAuth(code: string): Promise<{ id: string; login: string; avatar_url: string } | null> {
  const { clientId, clientSecret } = config.github;

  try {
    // 1. 用 code 换 access_token
    const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    const tokenData = await tokenResp.json() as any;

    if (tokenData.error) {
      console.error(`[GitHub] OAuth 失败: ${tokenData.error} ${tokenData.error_description}`);
      return null;
    }

    const accessToken = tokenData.access_token;

    // 2. 用 access_token 获取用户信息
    const userResp = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
        "User-Agent": "glm-travel-app",
      },
    });
    const userData = await userResp.json() as any;

    if (!userData.id) {
      console.error("[GitHub] 获取用户信息失败:", userData);
      return null;
    }

    return {
      id: String(userData.id),
      login: userData.login,
      avatar_url: userData.avatar_url,
    };
  } catch (err) {
    console.error("[GitHub] OAuth 请求异常:", err);
    return null;
  }
}

/**
 * 生成用户 token（HMAC 签名）
 */
export function generateToken(openid: string): string {
  const payload = `${openid}:${Date.now()}:${crypto.randomBytes(8).toString("hex")}`;
  const hmac = crypto.createHmac("sha256", config.auth.tokenSecret).update(payload).digest("hex");
  const token = `${Buffer.from(payload).toString("base64url")}.${hmac}`;

  tokenStore.set(token, {
    openid,
    expiresAt: Date.now() + config.auth.tokenExpireMs,
  });

  return token;
}

/**
 * 验证 token，返回 openid 或 null
 */
export function verifyToken(token: string): string | null {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const payloadB64 = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);
  const expectedSig = crypto.createHmac("sha256", config.auth.tokenSecret)
    .update(Buffer.from(payloadB64, "base64url").toString())
    .digest("hex");

  if (sig !== expectedSig) return null;

  const record = tokenStore.get(token);
  if (!record || Date.now() > record.expiresAt) {
    tokenStore.delete(token);
    return null;
  }

  return record.openid;
}

/**
 * 鉴权：优先 token（微信登录），兼容 API Key（调试用）
 * 返回 userId (openid / "apikey" / "dev") 或 null（未授权）
 */
export function authenticate(req: http.IncomingMessage): string | null {
  const authHeader = req.headers["authorization"] || "";
  const { apiKey } = config.auth;
  const { appid } = config.wx;

  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    const openid = verifyToken(token);
    if (openid) return openid;

    if (apiKey && token === apiKey) return "apikey";
  }

  const url = new URL(req.url || "", "http://localhost");
  if (apiKey && url.searchParams.get("api_key") === apiKey) return "apikey";

  // 未配置任何鉴权时，开发模式放行
  if (!apiKey && !appid) return "dev";

  return null;
}
