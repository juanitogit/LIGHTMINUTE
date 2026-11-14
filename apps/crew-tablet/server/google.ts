/** Same server-only OAuth flow for Vite and Cloudflare Pages Functions. */
import { createRemoteJWKSet, jwtVerify, SignJWT, type JWTPayload } from "jose";

export interface GoogleEnv {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  AUTH_SESSION_SECRET?: string;
}
export interface GoogleUser { id: string; name: string; email: string }
interface Services {
  fetch: typeof fetch;
  verifyIdToken: (token: string, audience: string) => Promise<JWTPayload>;
}
const origins = new Set(["http://localhost:5173", "https://lightminute.pages.dev"]);
const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const defaults: Services = {
  fetch: (...args) => fetch(...args),
  verifyIdToken: async (token, audience) => (await jwtVerify(token, jwks, {
    audience, issuer: ["https://accounts.google.com", "accounts.google.com"],
    algorithms: ["RS256"], maxTokenAge: "1h", clockTolerance: 5,
  })).payload,
};
const encoder = new TextEncoder();

function configured(env: GoogleEnv) {
  return Boolean(env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim()
    && (env.AUTH_SESSION_SECRET?.trim().length ?? 0) >= 32);
}
function cookieName(kind: "flow" | "session", origin: string) {
  return `${origin.startsWith("https:") ? "__Host-" : ""}lm_${kind}`;
}
function cookie(name: string, value: string, origin: string, age: number) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${origin.startsWith("https:") ? "; Secure" : ""}`;
}
function readCookie(request: Request, name: string) {
  return request.headers.get("cookie")?.split(";").map(part => part.trim())
    .find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);
}
function response(body: unknown, status = 200, cookies: string[] = [], location?: string) {
  const headers = new Headers({ "Cache-Control": "no-store", "Pragma": "no-cache",
    "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" });
  if (location) headers.set("Location", location);
  else headers.set("Content-Type", "application/json; charset=utf-8");
  for (const value of cookies) headers.append("Set-Cookie", value);
  return new Response(location ? null : JSON.stringify(body), { status, headers });
}
async function sign(payload: JWTPayload, purpose: string, origin: string, env: GoogleEnv, age: number) {
  return new SignJWT({ ...payload, purpose }).setProtectedHeader({ alg: "HS256" })
    .setIssuer("lightminute").setAudience(origin).setIssuedAt().setExpirationTime(`${age}s`)
    .sign(encoder.encode(env.AUTH_SESSION_SECRET!.trim()));
}
async function verify(token: string | undefined, purpose: string, origin: string, env: GoogleEnv) {
  if (!token || token.length > 8192) return null;
  try {
    const { payload } = await jwtVerify(token, encoder.encode(env.AUTH_SESSION_SECRET!.trim()), {
      algorithms: ["HS256"], issuer: "lightminute", audience: origin,
    });
    return payload.purpose === purpose ? payload : null;
  } catch { return null; }
}
function random() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, "0")).join("");
}
async function challenge(verifier: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(verifier)));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function validUser(value: unknown): value is GoogleUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  return ["id", "name", "email"].every(k => typeof user[k] === "string" && user[k].length <= 320)
    && Boolean(user.id) && Boolean(user.email);
}

export async function handleGoogleAuth(request: Request, env: GoogleEnv, services: Services = defaults): Promise<Response> {
  const url = new URL(request.url);
  const origin = url.origin;
  if (!origins.has(origin)) return response({ error: "origin_not_allowed" }, 403);
  const path = url.pathname;
  const flowName = cookieName("flow", origin);
  const sessionName = cookieName("session", origin);
  const clearFlow = cookie(flowName, "", origin, 0);
  const clearSession = cookie(sessionName, "", origin, 0);
  if (path === "/api/auth/logout") {
    if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);
    if (request.headers.get("origin") !== origin) return response({ error: "origin_not_allowed" }, 403);
    return response({ ok: true }, 200, [clearSession, clearFlow]);
  }
  if (request.method !== "GET") return response({ error: "method_not_allowed" }, 405);
  if (path === "/api/auth/session") {
    if (!configured(env)) return response({ configured: false, user: null });
    const session = await verify(readCookie(request, sessionName), "session", origin, env);
    return response({ configured: true, user: validUser(session?.user) ? session.user : null });
  }
  if (path !== "/api/auth/google/login" && path !== "/api/auth/google/callback") {
    return response({ error: "not_found" }, 404);
  }
  if (!configured(env)) return response({ error: "google_auth_not_configured" }, 503);
  const redirectUri = `${origin}/api/auth/google/callback`;
  if (path === "/api/auth/google/login") {
    const state = random(), nonce = random(), verifier = random();
    const flow = await sign({ state, nonce, verifier }, "flow", origin, env, 600);
    const target = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    target.search = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID!.trim(),
      redirect_uri: redirectUri, response_type: "code", scope: "openid email profile",
      state, nonce, code_challenge: await challenge(verifier), code_challenge_method: "S256",
      prompt: "select_account", access_type: "online" }).toString();
    return response(null, 302, [cookie(flowName, flow, origin, 600)], target.toString());
  }

  const flow = await verify(readCookie(request, flowName), "flow", origin, env);
  if (!flow || typeof flow.state !== "string" || flow.state !== url.searchParams.get("state")
      || typeof flow.nonce !== "string" || typeof flow.verifier !== "string") {
    return response({ error: "invalid_oauth_state" }, 400, [clearFlow]);
  }
  if (url.searchParams.has("error")) return response(null, 303, [clearFlow], `${origin}/?auth_error=denied`);
  const code = url.searchParams.get("code");
  if (!code || code.length > 4096) return response({ error: "missing_code" }, 400, [clearFlow]);
  try {
    const tokenResponse = await services.fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID!.trim(),
        client_secret: env.GOOGLE_CLIENT_SECRET!.trim(), redirect_uri: redirectUri,
        grant_type: "authorization_code", code_verifier: flow.verifier }),
      signal: AbortSignal.timeout(10000),
    });
    if (!tokenResponse.ok) throw new Error("Token exchange failed");
    const tokens = await tokenResponse.json() as Record<string, unknown>;
    if (typeof tokens.id_token !== "string") throw new Error("ID token missing");
    const claims = await services.verifyIdToken(tokens.id_token, env.GOOGLE_CLIENT_ID!.trim());
    if (claims.nonce !== flow.nonce || claims.email_verified !== true
        || typeof claims.sub !== "string" || typeof claims.email !== "string") {
      throw new Error("Identity claims invalid");
    }
    const user = { id: claims.sub, name: typeof claims.name === "string" ? claims.name : "Google user", email: claims.email };
    if (!validUser(user)) throw new Error("Identity claims invalid");
    const session = await sign({ user }, "session", origin, env, 3600);
    // OAuth tokens are discarded; only the minimal app identity goes into an HttpOnly cookie.
    return response(null, 303, [clearFlow, cookie(sessionName, session, origin, 3600)], `${origin}/`);
  } catch {
    return response(null, 303, [clearFlow], `${origin}/?auth_error=failed`);
  }
}
