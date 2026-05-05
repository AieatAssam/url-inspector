# Redirect Resolver — Cloudflare Worker

Optional serverless function for accurate URL redirect resolution.
The worker runs server-side, so it can see Location headers that the browser
hides from JavaScript due to CORS.

## Why This Exists

URL shorteners like `flip.it`, `bit.ly`, `t.co` return HTTP 302 redirects with
a `Location` header pointing to the final destination. The browser's `fetch()`
API refuses to let JavaScript read this header due to CORS — the short URL
services don't set `Access-Control-Allow-Origin`.

This Worker fetches URLs server-side (no CORS) and returns the redirect chain
as JSON. It has CORS headers so the browser can read the response freely.

## Deploy

Requires a Cloudflare account (free tier: 100k requests/day).

```bash
cd worker
npm install wrangler --save-dev
npx wrangler deploy
```

## Usage

After deploying, configure the worker URL in the app:

```
https://url-inspector-resolver.<your-subdomain>.workers.dev/resolve?url=https://flip.it/abc123
```

Response:

```json
{
  "status": 302,
  "location": "https://www.forbes.com/...",
  "timingMs": 123,
  "hops": [
    "https://flip.it/abc123",
    "https://www.forbes.com/..."
  ]
}
```

## Without the Worker

The URL Inspector works entirely client-side without this worker. For ~95%
of URLs, the `og:url` / canonical tag from the proxy'd HTML provides the
final destination. The worker is only needed for sites that block scraping
(JS challenges, paywalls, bot detection).
