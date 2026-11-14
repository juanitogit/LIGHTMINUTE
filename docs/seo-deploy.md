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

The project no longer ships a GitHub Pages/Cloudflare workflow (it was removed in
`ee97540`), so deployment is manual. Cloudflare Pages project: `lightminute`.

```powershell
cd apps/crew-tablet
npm ci
npm run build
npx wrangler login          # only the first time
npx wrangler pages deploy dist --project-name lightminute --branch main
```

CI still guards the tag (`.github/workflows/ci.yml` fails if `google-site-verification`
is missing from `dist/index.html`).

Confirm the tag is really live before clicking Verify in Search Console:

```powershell
(Invoke-WebRequest https://lightminute.pages.dev/ -UseBasicParsing).Content -match 'qHznM4pcKgtis3SqM9c9eMWA-Kg5TRxGNvULQlbQALc'
(Invoke-WebRequest https://lightminute.pages.dev/sitemap.xml -UseBasicParsing).Headers['Content-Type']  # must be application/xml
```

If `sitemap.xml` comes back as `text/html`, Pages is serving the SPA fallback: the deploy
did not upload `dist/` (stale build or wrong output directory).

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
