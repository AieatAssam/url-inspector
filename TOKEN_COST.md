# Token Cost Tracking — URL Inspector

Tracking token usage across this project. All work done in a single session on 2026-05-04.

**Model:** deepseek/deepseek-v4-flash via OpenClaw  
**Data source:** `session_status` snapshots taken at each meaningful boundary

---

## Per-Turn Breakdown

| # | Turn | Input (cached) | Input (new) | Output | Cache | Cost | Cumul. cost |
|---|---|---|---|---|---|---|---|
| 1 | Research + Build — web searches, project scaffold, core library, 5 components, GH Pages deploy | 67k | 36k | 30k | 65% | $0.01 | $0.01 |
| 2 | Cost tracking setup — AGENTS.md, git init, initial push | +4k | +26k | 557 | 53% | — | $0.01 |
| 3 | CI fix + tests — npm lock format fix, 94 unit tests, coverage gating (90%+ lib), GHA workflow | +6k | +6k | 95 | 53% | — | $0.01 |
| 4 | URL wrappers — Google/FB/Reddit detection, share.google handling, x-final-url probe, synthetic hops | +9k | +9k | 157 | 53% | +$0.03 | $0.04 |
| 5 | Power features — per-hop headers, status meanings, tracking param breakdown, probe dedup & URL fix | +5k | +5k | 80 | — | — | $0.04 |
| 6 | 403 handling — 4xx/5xx proxy retry, fake User-Agent, x-final-url from error responses, flip.it test | +18k | +19k | 7.8k | 51% | — | $0.04 |
| 7 | *(sub-agent in progress)* OG preview, UX polish, agent-browser testing | +? | +4k | 1.2k | 51% | — | $0.04 |

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
| Current (sub-agent running) | HEAD | 277k | 1.2k | 286k |

---

## Notes

- "In" is cumulative across the session. "Out" is per-turn output for the most recent model response.
- "Cached" = tokens served from system prompt / context cache (provider telemetry).
- Gaps between snapshot #4→#5 and #5→#6 mean some turns weren't individually snapshotted; deltas are best estimates from available data.
- The sub-agent (#7) is currently building OG preview features — will be updated on completion.
