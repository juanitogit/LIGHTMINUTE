# Google sign-in: localhost and Cloudflare Pages

> Historical record only: Google sign-in was removed on 2026-11-15. These
> instructions no longer describe the application or its deployment.

Google OAuth runs on the server. The browser never receives the client secret,
Google access token or refresh token. Scopes are limited to `openid email profile`.

## Register these exact URLs in Google Cloud

Client type: **Web application**, under Google Auth Platform → Clients.

| Setting | Local development | Production |
| --- | --- | --- |
| Authorized JavaScript origin | `http://localhost:5173` | `https://lightminute.pages.dev` |
| Authorized redirect URI | `http://localhost:5173/api/auth/google/callback` | `https://lightminute.pages.dev/api/auth/google/callback` |

The redirect URIs have no trailing slash. The redirect path is an API endpoint,
not a folder that must exist before registering it in Google. `127.0.0.1`, other
ports and Cloudflare preview domains are intentionally not registered or accepted.
If the consent screen is in Testing, add the Google accounts that will test it
under Google Auth Platform → Audience → Test users.

## Run locally

The repository-root `.env`, ignored by Git, contains `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET` and a random `AUTH_SESSION_SECRET` of at least 32 characters.
See `.env.example`. Never prefix secrets with `VITE_`.

```powershell
cd apps/crew-tablet
npm ci
npm run dev
```

Visit **http://localhost:5173**, then use **Sign in with Google** in the header.
Vite serves `/api/auth/*` before forwarding other `/api` requests to Python, so
Google sign-in works even when the Python API is off. The port is strict to avoid
silently changing to a port Google has not authorized. Restart Vite after changing
the `.env` file. Production API functionality unrelated to Google is unchanged.

## Configure and deploy Cloudflare

The Cloudflare Pages project is `lightminute`, configured by
`apps/crew-tablet/wrangler.toml`. The client ID is public and lives in `[vars]`.
Set **encrypted secrets** `GOOGLE_CLIENT_SECRET` and `AUTH_SESSION_SECRET` in
Workers & Pages → lightminute → Settings → Variables and Secrets, production.
Use the same client ID as the Google Cloud client configured above.

Alternatively, from `apps/crew-tablet`, use Wrangler's secret prompts (do not put
secrets directly in command arguments):

```powershell
npx wrangler login --scopes account:read user:read pages:write
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name lightminute
npx wrangler pages secret put AUTH_SESSION_SECRET --project-name lightminute
npm run cf:deploy
```

Deploy from **apps/crew-tablet**, so Wrangler discovers its `functions/` directory.
Uploading only `dist/` through a static uploader will not deploy the OAuth API.
Functions routing is limited to `/api/auth/*` through `public/_routes.json`.
Keep the OAuth routes out of the public sitemap.

## Routes and security behavior

| Route | Behavior |
| --- | --- |
| `GET /api/auth/google/login` | Starts Google authorization with state, nonce and PKCE S256. |
| `GET /api/auth/google/callback` | Checks state, exchanges the one-use code server-side, validates the Google ID-token signature, issuer, audience, age and nonce, and requires verified email. |
| `GET /api/auth/session` | Returns minimal signed-in identity, or `user: null`; never returns credentials or OAuth tokens. |
| `POST /api/auth/logout` | Requires a same-origin request and clears app session cookies. It does not sign out of the user's Google account. |

Flow cookies expire in 10 minutes and app sessions in one hour. Cookies are
HttpOnly and SameSite=Lax; production uses Secure and the `__Host-` prefix.
Responses are `no-store`; errors never include Google's raw response. Session
cookies are signed, not encrypted, and contain only Google subject, name and email.
Rotating `AUTH_SESSION_SECRET` invalidates existing cookies. Stateless sessions
have no centralized revocation list. This identity does not grant medical,
flight-surgeon or crew roles: the existing mission demo PIN remains a separate
demonstration mechanism. No Google identity or health information is written to
Neon by this integration, and no new Google APIs beyond sign-in are authorized.

## Verify

```powershell
npm run test:auth
npm run build
npx wrangler pages functions build --outdir ../../tmp/cloudflare-auth
```

After deployment, `/api/auth/session` should return
`{"configured":true,"user":null}` before login. The login route should redirect
to Google with the exact callback above. Completing real sign-in requires the
Google account owner's browser consent; mocked tests are not proof of that consent.

## Local verification status — 2026-11-14

- 12/12 OAuth security/session tests passed; TypeScript and Vite build passed.
- Cloudflare Pages Functions compiled successfully.
- An additional local Workerd/Miniflare runtime check failed to initialize on this
  Windows environment, including its minimal baseline. This does not constitute
  a successful production runtime test; verify the deployed routes after publishing.
- Real localhost routes returned configured session HTTP 200 and Google redirect HTTP 302.
- Browser checks passed for sign-in availability, exact callback, 390/1440px layout,
  and account display/logout with synthetic responses. Public bundles contain no secrets.
- Cloudflare secrets and deployment will be configured manually by the deployment
  owner, as requested. No Cloudflare login, deployment or real Google account sign-in
  was completed from this workstation. Google redirect registration remains external.

Sources: [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server),
[Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect),
[Pages Functions routing](https://developers.cloudflare.com/pages/functions/routing/),
[Pages secrets](https://developers.cloudflare.com/pages/functions/bindings/#secrets).
