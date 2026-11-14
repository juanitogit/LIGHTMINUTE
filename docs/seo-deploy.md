# Deploy and Google indexing (LIGHTMINUTE / crew tablet)

The public demo is the crew tablet PWA served at <https://lightminute.pages.dev/> from
Cloudflare Pages. This page is the only indexable URL: the app is a single document
with in-page views, so there are no path routes to list.

## What lives where

| File | Purpose | Ends up at |
| --- | --- | --- |
| `apps/crew-tablet/index.html` | `<head>`: verification tag, title, description, canonical, Open Graph, JSON-LD | `/` |
| `apps/crew-tablet/public/robots.txt` | Crawl rules + sitemap pointer | `/robots.txt` |
| `apps/crew-tablet/public/sitemap.xml` | URL list (single entry) | `/sitemap.xml` |
| `apps/crew-tablet/public/_headers` | Cloudflare Pages cache/type headers | applied by Pages |

Everything in `public/` is copied verbatim into `dist/` by Vite.

## Verification tag across pages

The same `google-site-verification` token is present exactly once inside `<head>`
in all four HTML entry points: the crew tablet, the ground console, the standalone
protocol runner demo and the three-lens prototype. The tablet's Glance, Why, Act,
Radiation, Validation and Check-in views share its single HTML document and tag.

This tag verifies ownership in Search Console; submitting `sitemap.xml` is a
separate step. Google checks the public homepage for HTML-tag verification:
[Google's ownership verification instructions](https://support.google.com/webmasters/answer/9008080?hl=en).
Keep the token after verification so ownership can be checked again.

The other three HTML files are standalone repository demos and are not included
in the crew tablet's Vite `dist/`. They do not add public URLs to the sitemap.
Add URLs only when those pages are actually deployed at their final locations.

## Deploy

```powershell
cd apps/crew-tablet
npm ci
npm run build

# first time: npx wrangler login
npx wrangler pages deploy dist --project-name lightminute
```

After deploying, confirm the tag is really live (HTML is not case/space sensitive here,
just look for `google-site-verification`):

```powershell
(Invoke-WebRequest https://lightminute.pages.dev/ -UseBasicParsing).Content -match 'qHznM4pcKgtis3SqM9c9eMWA-Kg5TRxGNvULQlbQALc'
(Invoke-WebRequest https://lightminute.pages.dev/robots.txt -UseBasicParsing).StatusCode
(Invoke-WebRequest https://lightminute.pages.dev/sitemap.xml -UseBasicParsing).StatusCode
```

All three must return truthy/200 **before** clicking Verify in Search Console.

## Google Search Console checklist

1. Add property `https://lightminute.pages.dev/` (URL-prefix property, not domain).
2. Verification method **HTML tag** — the tag is already in `index.html`; click *Verify*
   once the deploy above is live. If it fails, the deploy is stale or Pages served a
   cached `index.html`.
3. *Sitemaps* → submit `sitemap.xml`. Expect `Success`/`Discovered`, not `Couldn't fetch`.
4. *URL inspection* → paste `https://lightminute.pages.dev/` → **Request indexing**.
5. Optional: *Settings → Crawl stats* after a few days to confirm Googlebot fetches `/`.

## Rules for future changes

- Change `<lastmod>` in `sitemap.xml` whenever a user-visible change ships; don't fake
  it on every build or Google learns to ignore it.
- If a second public route is ever added, add a real `<loc>` entry. Do **not** list
  `#`-fragments: crawlers ignore them.
- Keep the title and the `<h1>`/brand in the app aligned. The deployed build brands the
  UI as **LIGHTMINUTE**; the internal project name is **TETHER** and stays in the docs.
- Do not add medical claims to the metadata. The safety line ("Synthetic data only; not a
  medical device.") is part of every description on purpose.
- There is no `og:image` yet. When one exists, host it under `public/` and switch
  `twitter:card` to `summary_large_image`.
