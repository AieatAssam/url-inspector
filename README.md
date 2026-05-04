# 🔗 URL Inspector

Inspect URL redirect chains, measure hop latency, and strip tracking parameters — all client-side, no backend required.

![screenshot](/url-inspector/screenshot.png)

## Features

- **Redirect Chain Trace** — follows each hop in a redirect chain
- **Per-Hop Latency** — measures timing for each redirect
- **Tracking Parameter Stripper** — cleans URLs of `utm_*`, `fbclid`, `gclid`, and 20+ trackers
- **Tiered Information** — basic summary by default, advanced mode for full details
- **Visual Timing Bars** — color-coded latency bars (green/yellow/red)
- **CORS Proxy Fallback** — handles URLs that block direct inspection
- **Zero Account Required** — all data stays in your browser

## Tech Stack

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4
- shadcn/ui (Radix primitives)
- Deployed on GitHub Pages

## Development

```bash
npm install
npm run dev
```

## Deployment

The site auto-deploys via GitHub Actions on push to `main`.

To deploy manually:

```bash
npm run deploy
```

## How URL Inspection Works

1. The browser sends a `fetch` request with `redirect: 'manual'`
2. If a `3xx` response is returned, we read the `Location` header
3. We continue following the chain until we reach a non-redirect response
4. Each hop's timing is measured with `performance.now()`
5. If CORS blocks direct inspection, we fall back to a public CORS proxy

## License

MIT
