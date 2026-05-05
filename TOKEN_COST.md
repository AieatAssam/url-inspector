# Token Cost Tracking — URL Inspector

Tracking token usage across this project.

**Model:** deepseek/deepseek-v4-flash via OpenClaw  
**Data source:** `session_status` snapshots taken at each meaningful boundary

---

## Per-Turn Breakdown

| # | Date | Turn | Input (cached) | Input (new) | Output | Cache | Cost | Cumul. cost |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-05-04 | Research + Build — web searches, project scaffold, core library, 5 components, GH Pages deploy | 67k | 36k | 30k | 65% | $0.01 | $0.01 |
| 2 | 2026-05-04 | Cost tracking setup — AGENTS.md, git init, initial push | +4k | +26k | 557 | 53% | — | $0.01 |
| 3 | 2026-05-04 | CI fix + tests — npm lock format fix, 94 unit tests, coverage gating (90%+ lib), GHA workflow | +6k | +6k | 95 | 53% | — | $0.01 |
| 4 | 2026-05-04 | URL wrappers — Google/FB/Reddit detection, share.google handling, x-final-url probe, synthetic hops | +9k | +9k | 157 | 53% | +$0.03 | $0.04 |
| 5 | 2026-05-04 | Power features — per-hop headers, status meanings, tracking param breakdown, probe dedup & URL fix | +5k | +5k | 80 | — | — | $0.04 |
| 6 | 2026-05-04 | 403 handling — 4xx/5xx proxy retry, fake User-Agent, x-final-url from error responses, flip.it test | +18k | +19k | 7.8k | 51% | — | $0.04 |
| 7 | 2026-05-04 | **OG Preview build** — fetch OG metadata via CORS proxy, HTML head parser, preview card, 15 tests, 3 commits | *sub-agent* | — | — | — | — | $0.04 |
| 8 | 2026-05-04 | **Polish pass** — code cleanup, agent-browser testing (8 URLs), UI animations, edge case hardening, 3 commits | *sub-agent* | +23k | — | 3% | — | $0.04 |
| 9 | 2026-05-05 | **Proxy fix + coverage + optimizations** — switched corsproxy.io → api.codetabs.com, inline HTML parsing for proxy final URL (eliminated double-fetch, 25x speedup), added 15+ tracking params (tag, linkCode, linkId, gad_source, gad_campaign, gad, mtm_*, pk_*, epik, CMP, cmp), improved badges with counts, proper singular/plural, proxy-resolved URL display, timeout reduction 15s→10s, 157 tests/90%+ coverage, updated README/screenshot, TEST_URLS.md | ~56k | ~50k | 14k | 58% | +$0.03 | $0.09 |

> Rows 2-6: delta from previous `session_status` snapshot. Cache hit rates are snapshot-level, not deltas.

---

## Snapshot Log

| Timestamp | Snapshot | In | Out (turn) | Cached |
|---|---|---|---|---|
| Initial build complete | commit bb026d2 | 36k | 30k | 67k |
| After push + AGENTS.md | commit a466707 | 62k | 557 | 71k |
| After CI/tests push | commit e588422 | 68k | 652 | 77k |
| After URL wrappers | commit 30ded68 | 77k | — | 86k |
| After power features | commit eb46e2a | 82k | — | 91k |
| After 403 handling | commit be0a1d3 | 273k | 7.8k | 287k |
| After polish pass | HEAD (prev) | 277k | 1.2k | 286k |
| After proxy fix + improvements | HEAD (prev) | 95k + 12.9m cached | 36.6k | 99% |
| After iteration 2 (optimizations + coverage) | HEAD (current) | 99k + 137k cached | 43k | 58% |

---

## Notes

- "In" is cumulative across the session. "Out" is per-turn output for the most recent model response.
- "Cached" = tokens served from system prompt / context cache (provider telemetry).
- Session #9: massive cache hit (99%) because system prompt + CLAUDE.md context was heavily reused from prior turns.
