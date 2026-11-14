import { loadEnv, type Plugin, type ViteDevServer, type PreviewServer } from "vite";
import { handleGoogleAuth, type GoogleEnv } from "./google";

export function googleAuthPlugin(envDirectory: string): Plugin {
  let env: GoogleEnv;
  function mount(server: ViteDevServer | PreviewServer) {
    // Mount before Vite's /api proxy, so no Python server is needed for Google login.
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.split("?")[0]?.startsWith("/api/auth/")) { next(); return; }
      try {
        const headers = new Headers();
        for (const [name, values] of Object.entries(req.headers)) {
          if (Array.isArray(values)) for (const value of values) headers.append(name, value);
          else if (values) headers.set(name, values);
        }
        const origin = `http://${req.headers.host ?? "localhost:5173"}`;
        const request = new Request(new URL(req.url, origin), { method: req.method, headers });
        const response = await handleGoogleAuth(request, env);
        res.statusCode = response.status;
        response.headers.forEach((value, name) => { if (name !== "set-cookie") res.setHeader(name, value); });
        res.setHeader("Set-Cookie", response.headers.getSetCookie());
        res.end(await response.text());
      } catch {
        res.statusCode = 500;
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "authentication_unavailable" }));
      }
    });
  }
  return {
    name: "lightminute-google-auth",
    configResolved(config) {
      const values = loadEnv(config.mode, envDirectory, "");
      env = { GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? values.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? values.GOOGLE_CLIENT_SECRET,
        AUTH_SESSION_SECRET: process.env.AUTH_SESSION_SECRET ?? values.AUTH_SESSION_SECRET };
    },
    configureServer: mount,
    configurePreviewServer: mount,
  };
}
