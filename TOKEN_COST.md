# Token Cost Tracking — URL Inspector

Tracking token usage and estimated costs for this project.

## Rate assumptions

- **Model:** deepseek/deepseek-v4-flash (OpenClaw default)
- **Data source:** `session_status` reports
- All work done in one session on 2026-05-04

---

## Final Session

| Metric | Value |
|---|---|
| Input (new) | 273k tokens |
| Input (cached) | 287k tokens |
| Output (last turn) | 7.8k tokens |
| Cache hit rate | 51% |
| Estimated cost | $0.04 |
| Max context used | 287k / 1M (29%) |

## Activity Log

| # | Phase | What was done |
|---|---|---|
| 1 | **Research** | Web searches for tool ideas, analysis of Reddit/HN pain points, proposed 8 candidates, user picked URL Inspector |
| 2 | **Scaffold & Build** | Vite + React 19 + TS 6 + Tailwind 4 + shadcn/ui, redirect chain library, CORS fallback, timing, 5 components |
| 3 | **CI & Tests** | npm lock fix (npm 10 vs 11), caching, 94 unit tests, coverage gating (90%+ lib), agent instructions |
| 4 | **URL Detection** | URL wrappers (Google, Facebook, Reddit, LinkedIn), `share.google` handling, x-final-url probe, synthetic hops |
| 5 | **Power Features** | Per-hop response headers, status meanings, tracking param breakdown, probe dedup, probe URL fix |
| 6 | **403 Handling** | 4xx/5xx retry via CORS proxy, fake User-Agent header, x-final-url from non-200 proxy responses, flip.it URL test |

**Total test count:** 118 tests across 9 test files

---

## How to update

See `AGENTS.md` for the mandatory cost-tracking workflow. Before/after each future session: run `session_status`, append new activity row.
