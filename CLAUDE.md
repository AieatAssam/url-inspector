# URL Inspector — Agent Instructions

## Mandatory Cost Tracking

Before every work session and after completing work, you **must** track token usage.

**How to track:**

1. Run `session_status` to capture current token/cache/cost stats
2. Do the work
3. Run `session_status` again to capture ending stats
4. **Open and update `TOKEN_COST.md`** with:
   - Date + brief description of what was done
   - Input tokens (split cached / new) and output tokens
   - Cache hit rate
   - Updated running totals at the top of the file

Use the existing table format in `TOKEN_COST.md`. Add a new row per activity.

This applies to **every** session that touches this repo — even "quick fixes."

## Project Context

- **Repo:** https://github.com/AieatAssam/url-inspector
- **Deploy:** GitHub Pages via GHA workflow (`.github/workflows/deploy.yml`)
- **Build:** `npm run build` (tsc + vite)
- **Dev:** `npm run dev`
- **Stack:** React 19, TypeScript 6, Vite 8, Tailwind 4, shadcn/ui
- **No backend** — 100% client-side static site
- **Branch:** `main`

## Key Files

| File | Purpose |
|---|---|
| `src/lib/urlInspector.ts` | Core logic: redirect following, CORS fallback, timing |
| `src/lib/urlCleaner.ts` | Tracking parameter stripping |
| `src/components/` | UI components (UrlForm, HopNode, RedirectChain, etc.) |
| `TOKEN_COST.md` | Token tracking ledger |
| `CLAUDE.md` | This file — primary agent instructions |
| `AGENTS.md` | Legacy alias pointing here — same content |
| `.github/workflows/deploy.yml` | Auto-deploy to Pages on push to main |
