# BIBSS v1.3 — autonomous build metrics

Built by the **IntegratedAgent autonomous build loop** (contained, judged, under a recorded
§3.4 grant). Source of truth: the hash-chained audit log `audit/exec_log.jsonl` in
IntegratedAgent (`verify-chain` confirms integrity). This doc is generated from that ledger.

## Headline
- **11 of 15 modules built**, **631 test assertions passing, 0 failing**
- Contained: `docker --network=none`, workspace-only mount; **clean grant (no `accept_unenforced` waiver)**
- Clean one-file-per-module structure (no monolith); no false-accepts (suite verified independently)
- Ceiling: the integration/composition module M10 (model reimplements deps instead of importing)

## Per-run timeline (each `daemon --build`, delimited by its recorded grant)

| # | grant (UTC) | grant posture | modules dispatched | built | failed-at | span |
|---|---|---|---|---|---|---|
| 1 | 2026-06-08T09:34:06 | clean grant (docker) | 2 | 1 | M2 | 85 min |
| 2 | 2026-06-08T12:58:26 | clean grant (docker) | 2 | 1 | M02 | 50 min |
| 3 | 2026-06-08T13:50:43 | clean grant (docker) | 10 | 9 | M07 | 206 min |
| 4 | 2026-06-08T18:08:11 | clean grant (docker) | 12 | 11 | M10 | 129 min |
| 5 | 2026-06-08T20:26:41 | clean grant (docker) | 1 | 0 | M10 | 50 min |

## Final per-module outcome (most recent record; the 15-module finer plan)

| module | built | exec | attempts | exit | containment |
|---|---|---|---|---|---|
| M01 | yes | passed | 1 | 0 | docker |
| M02 | yes | passed | 1 | 0 | docker |
| M03 | yes | passed | 2 | 0 | docker |
| M04 | yes | passed | 1 | 0 | docker |
| M05 | yes | passed | 1 | 0 | docker |
| M06 | yes | passed | 1 | 0 | docker |
| M07 | yes | passed | 1 | 0 | docker |
| M08 | yes | passed | 1 | 0 | docker |
| M09 | yes | passed | 1 | 0 | docker |
| M10 | NO | None | 1 | None | None |
| M11 | yes | passed | 1 | 0 | docker |
| M12 | yes | passed | 1 | 0 | docker |

## The four walls (each produced a shipped, tested loop fix)
1. **Full 71KB spec in every dispatch** → 30-min timeout → spec-trimming (commit c5a3d60)
2. **Cover-coarsening coverage mismatch** (§6.3 vs §6) → keep the planner's fine covers
3. **Self-generated bloat** (monolith + 71KB growing suite in every brief) → scale-pack:
   snapshot-trim to dependency closure + per-module test files + file-enforcement (76f8199)
4. **Rate-limit treated as failure + costly restarts** → rate-limit backoff + `--resume` (cb74b4a)

## Honest gaps
- **No token/cost metrics**: the loop records built/exec/attempts/timestamps, not `claude -p`
  token spend (only the per-dispatch `--budget` cap, not actual usage).
- **Partial engine (11/15)**: leaf modules + tests are complete; the integration tail
  (M10 inference-engine, M13/M14 adapters, M15 public API) is NOT built — there is no
  assembled `infer()` entry point yet. See ADR-012 in IntegratedAgent for the full finding.
