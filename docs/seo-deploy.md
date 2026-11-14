# Deploy and Google indexing (LIGHTMINUTE crew tablet)

The public demo is the crew tablet PWA served at <https://lightminute.pages.dev/> from
Cloudflare Pages. It is the only indexable URL: the app is a single document with in-page
views, so there are no path routes to list.

## What lives where

| File | Purpose | Ends up at |
| --- | --- | --- |
| `apps/crew-tablet/index.html` | `<head>`: verification tag, title, description, canonical, Open Graph, JSON-LD | `/` |
| `apps/crew-tablet/public/robots.txt` | Crawl rules + sitemap pointer | `/robots.txt` |
| `apps/crew-tablet/public/sitemap.xml` | URL list (single entry) | `/sitemap.xml` |
| `apps/crew-tablet/public/_headers` | Cloudflare Pages cache/type headers | applied by Pages |

Everything in `public/` is copied verbatim into `dist/` by Vite.

> History note: commit `e0c1fb5` (LIGHTMINUTE workspace/anatomy) replaced `index.html`
> and silently dropped the verification tag and the canonical/OG block. Both are restored
> here, and CI now fails if the tag disappears from `dist/index.html`.

## Deploy

Cloudflare Pages project `lightminute` is connected to `main`, so a push to `main`
builds and deploys automatically. The project build configuration must be:

| Setting | Value |
| --- | --- |
| Root directory | `apps/crew-tablet` |
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |

This was fixed on 2026-11-14 after the project was found with an empty build config:
it was publishing the repository root instead of `dist/`, so new files such as
`data/space-weather.json` returned 404 while older files were served from cache. The
`build_config` now lives on the Pages project; changing it in the dashboard has the
same effect.

Manual deploy remains a fallback when a Git build is unavailable:

```powershell
cd apps/crew-tablet
npm ci
npm run build
npx wrangler login          # only the first time
npx wrangler pages deploy dist --project-name lightminute --branch main
```

CI still guards the tag (`.github/workflows/ci.yml` fails if `google-site-verification`
is missing from `dist/index.html`).

Google account sign-in is separate from Search Console ownership verification.
The app now also includes Pages Functions under `functions/api/auth/` and needs
the two server secrets documented in [google-oauth.md](google-oauth.md). Deploy
from `apps/crew-tablet` so Wrangler includes these functions alongside `dist/`.

Confirm the tag is really live before clicking Verify in Search Console:

Confirm the tag and the NASA snapshot are live before clicking Verify in Search Console:

```powershell
(Invoke-WebRequest https://lightminute.pages.dev/ -UseBasicParsing).Content -match 'qHznM4pcKgtis3SqM9c9eMWA-Kg5TRxGNvULQlbQALc'
(Invoke-WebRequest https://lightminute.pages.dev/sitemap.xml -UseBasicParsing).Headers['Content-Type']  # must be application/xml
$w = Invoke-RestMethod https://lightminute.pages.dev/data/space-weather.json
$w.status; $w.label; $w.events.Count  # ok / real-public / 391
```

If `sitemap.xml` or `data/space-weather.json` comes back as `text/html`, Pages is
serving the SPA fallback: check the build configuration above before redeploying.

No `NASA_API_KEY` is needed in Cloudflare. DONKI is keyless and the snapshot is
committed at build time; `VITE_API_BASE` stays empty because the Python API is not
deployed.

## Google Search Console checklist

1. Add property `https://lightminute.pages.dev/` (URL-prefix property, not domain).
2. Verification method **HTML tag** — already in `index.html`; click *Verify* once live.
3. *Sitemaps* → submit `sitemap.xml`; expect `Success`, not `Couldn't fetch`.
4. *URL inspection* → `https://lightminute.pages.dev/` → **Request indexing**.

## Rules for future changes

- Bump `<lastmod>` in `sitemap.xml` only when a user-visible change ships; faking it on
  every build teaches Google to ignore it.
- If a second public route appears, add a real `<loc>` entry. Never list `#`-fragments.
- Keep `<title>`, `og:title` and the in-app brand aligned (public brand: LIGHTMINUTE;
  TETHER is the internal codename and stays out of public metadata).
- No medical claims in metadata. The line "Synthetic data only; not a medical device."
  is deliberate.
- `og:image` is `assets/lightminute-official.png` (724x511). Replace it with a 1200x630
  image when one exists, then switch `twitter:card` to `summary_large_image`.
