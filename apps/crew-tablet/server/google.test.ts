import assert from "node:assert/strict";
import { test } from "node:test";
import { jwtVerify, SignJWT } from "jose";
import { handleGoogleAuth, type GoogleEnv } from "./google";

const local = "http://localhost:5173";
const production = "https://lightminute.pages.dev";
const env: GoogleEnv = { GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "server-only-secret", AUTH_SESSION_SECRET: "test-session-key-that-is-at-least-32-characters" };
const key = new TextEncoder().encode(env.AUTH_SESSION_SECRET!);
const get = (path: string, cookie?: string, origin = local) => new Request(`${origin}${path}`, {
  headers: cookie ? { Cookie: cookie } : {},
});
async function start(origin = local) {
  const response = await handleGoogleAuth(get("/api/auth/google/login", undefined, origin), env);
  const location = new URL(response.headers.get("location")!);
  const cookie = response.headers.getSetCookie()[0]!.split(";")[0]!;
  const token = cookie.slice(cookie.indexOf("=") + 1);
  const { payload } = await jwtVerify(token, key);
  return { response, location, cookie, payload };
}
async function callback(flow: Awaited<ReturnType<typeof start>>, claims: Record<string, unknown> = {}, fail = false) {
  const url = new URL("/api/auth/google/callback", local);
  url.search = new URLSearchParams({ state: String(flow.payload.state), code: "one-time-google-code" }).toString();
  let exchange: URLSearchParams | undefined;
  const result = await handleGoogleAuth(new Request(url, { headers: { Cookie: flow.cookie } }), env, {
    fetch: async (_url, init) => {
      assert.equal(String(_url), "https://oauth2.googleapis.com/token");
      exchange = init!.body as URLSearchParams;
      return Response.json(fail ? { error: "private-provider-error" } : { id_token: "google-id-token", access_token: "never-store-this-token" }, { status: fail ? 400 : 200 });
    },
    verifyIdToken: async (token, audience) => {
      assert.equal(token, "google-id-token");
      assert.equal(audience, env.GOOGLE_CLIENT_ID);
      return { sub: "user-123", email: "crew@example.invalid", name: "Synthetic Tester",
        nonce: flow.payload.nonce, email_verified: true, ...claims };
    },
  });
  return { result, exchange };
}

test("missing configuration keeps the app usable without disclosing secrets", async () => {
  const session = await handleGoogleAuth(get("/api/auth/session"), {});
  assert.deepEqual(await session.json(), { configured: false, user: null });
  const login = await handleGoogleAuth(get("/api/auth/google/login"), {});
  assert.equal(login.status, 503);
  assert.equal(login.headers.get("cache-control"), "no-store");
});

for (const origin of [local, production]) {
  test(`login has exact callback, PKCE, nonce and safe cookies for ${origin}`, async () => {
    const { response, location, payload } = await start(origin);
    assert.equal(response.status, 302);
    assert.equal(location.origin, "https://accounts.google.com");
    assert.equal(location.searchParams.get("redirect_uri"), `${origin}/api/auth/google/callback`);
    assert.equal(location.searchParams.get("scope"), "openid email profile");
    assert.equal(location.searchParams.get("code_challenge_method"), "S256");
    assert.match(location.searchParams.get("code_challenge")!, /^[\w-]{43}$/);
    assert.equal(location.searchParams.get("nonce"), payload.nonce);
    assert.equal(location.searchParams.get("state"), payload.state);
    assert.equal(location.searchParams.has("client_secret"), false);
    assert.equal(location.searchParams.has("code_verifier"), false);
    const cookies = response.headers.get("set-cookie")!;
    assert.match(cookies, /HttpOnly; SameSite=Lax; Max-Age=600/);
    assert.equal(cookies.includes("; Secure"), origin === production);
    if (origin === production) assert.match(cookies, /^__Host-lm_flow=/);
  });
}

test("unknown origins cannot select a callback or use a session", async () => {
  for (const origin of ["https://evil.invalid", "http://127.0.0.1:5173", "http://localhost:5174"]) {
    assert.equal((await handleGoogleAuth(get("/api/auth/google/login", undefined, origin), env)).status, 403);
  }
});

test("callback rejects missing or mismatched state without contacting Google", async () => {
  const flow = await start();
  for (const cookie of [undefined, flow.cookie]) {
    const result = await handleGoogleAuth(get("/api/auth/google/callback?state=wrong&code=bad", cookie), env);
    assert.equal(result.status, 400);
    assert.match(result.headers.get("set-cookie")!, /Max-Age=0/);
  }
});

test("a valid callback exchanges code server-side and establishes a signed identity", async () => {
  const flow = await start();
  const { result, exchange } = await callback(flow);
  assert.equal(result.status, 303);
  assert.equal(result.headers.get("location"), `${local}/`);
  assert.equal(exchange!.get("client_secret"), env.GOOGLE_CLIENT_SECRET);
  assert.equal(exchange!.get("code_verifier"), flow.payload.verifier);
  assert.equal(exchange!.get("redirect_uri"), `${local}/api/auth/google/callback`);
  const sessionCookie = result.headers.getSetCookie().find(c => c.startsWith("lm_session="))!.split(";")[0]!;
  const session = await handleGoogleAuth(get("/api/auth/session", sessionCookie), env);
  assert.deepEqual(await session.json(), { configured: true,
    user: { id: "user-123", name: "Synthetic Tester", email: "crew@example.invalid" } });
  assert.equal(result.headers.get("set-cookie")!.includes("never-store-this-token"), false);
  assert.equal(result.headers.get("set-cookie")!.includes(env.GOOGLE_CLIENT_SECRET!), false);
});

test("nonce mismatch and unverified email cannot create a session", async () => {
  for (const claims of [{ nonce: "wrong" }, { email_verified: false }, { sub: null }, { email: null }]) {
    const { result } = await callback(await start(), claims);
    assert.equal(result.headers.get("location"), `${local}/?auth_error=failed`);
    assert.equal(result.headers.getSetCookie().some(c => c.startsWith("lm_session=")), false);
  }
});

test("provider failures never expose the code, token or secret", async () => {
  const { result } = await callback(await start(), {}, true);
  assert.equal(result.headers.get("location"), `${local}/?auth_error=failed`);
  assert.equal(await result.text(), "");
  assert.equal([...result.headers.values()].join("").includes("private-provider-error"), false);
});

test("denying Google consent clears the flow and returns to this app", async () => {
  const flow = await start();
  const result = await handleGoogleAuth(get(`/api/auth/google/callback?state=${flow.payload.state}&error=access_denied`, flow.cookie), env);
  assert.equal(result.headers.get("location"), `${local}/?auth_error=denied`);
  assert.match(result.headers.get("set-cookie")!, /Max-Age=0/);
});

test("forged, expired, wrong-purpose and wrong-origin cookies are rejected", async () => {
  const user = { id: "test", email: "crew@example.invalid", name: "Tester" };
  const valid = new SignJWT({ user, purpose: "session" }).setProtectedHeader({ alg: "HS256" })
    .setIssuer("lightminute").setAudience(local).setExpirationTime("1h");
  const expired = await new SignJWT({ user, purpose: "session" }).setProtectedHeader({ alg: "HS256" })
    .setIssuer("lightminute").setAudience(local).setExpirationTime(1).sign(key);
  const wrongOrigin = await new SignJWT({ user, purpose: "session" }).setProtectedHeader({ alg: "HS256" })
    .setIssuer("lightminute").setAudience(production).setExpirationTime("1h").sign(key);
  const flow = await start();
  for (const token of [await valid.sign(new TextEncoder().encode("not-the-right-key")), expired, wrongOrigin, flow.cookie.split("=")[1]!]) {
    const result = await handleGoogleAuth(get("/api/auth/session", `lm_session=${token}`), env);
    assert.deepEqual(await result.json(), { configured: true, user: null });
  }
});

test("logout requires POST and the same Origin and clears both cookies", async () => {
  assert.equal((await handleGoogleAuth(get("/api/auth/logout"), env)).status, 405);
  for (const origin of [undefined, "https://evil.invalid"]) {
    const result = await handleGoogleAuth(new Request(`${local}/api/auth/logout`, {
      method: "POST", headers: origin ? { Origin: origin } : {},
    }), env);
    assert.equal(result.status, 403);
  }
  const result = await handleGoogleAuth(new Request(`${local}/api/auth/logout`, {
    method: "POST", headers: { Origin: local },
  }), env);
  assert.equal(result.status, 200);
  assert.equal(result.headers.getSetCookie().length, 2);
  assert.ok(result.headers.getSetCookie().every(c => c.includes("Max-Age=0")));
});

test("unrecognized routes and unsupported methods do not start authentication", async () => {
  assert.equal((await handleGoogleAuth(get("/api/auth/unknown"), env)).status, 404);
  assert.equal((await handleGoogleAuth(new Request(`${local}/api/auth/google/login`, { method: "POST" }), env)).status, 405);
});
