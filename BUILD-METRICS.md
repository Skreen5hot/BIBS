# BIBSS v1.3 — autonomous build metrics

Built by the **IntegratedAgent autonomous build loop** (contained, judged, under a recorded
§3.4 grant). Source of truth: the hash-chained audit log `audit/exec_log.jsonl` in
IntegratedAgent (`verify-chain` confirms integrity). This doc is generated from that ledger.

## Headline
- **15 of 15 modules built**, **928 test assertions passing, 0 failing** — including the
  integration tail and a working `infer()` public API.
- Contained: `docker --network=none`, workspace-only mount; **clean grant (no `accept_unenforced` waiver)**
- Clean one-file-per-module structure (no monolith); no false-accepts (suite verified independently)
- The composition tail (M10 inference-engine, M13/M14 adapters, M15 public API) crossed under
  COMPOSITION-1: dependency **interfaces** in each brief + a mechanical **no-reimplementation** gate.

## The composition crossing (COMPOSITION-1, ADR-013)

The prior ceiling was the integration modules: M10 (the inference engine, wiring six sub-modules)
walled **three times** by reimplementing a dependency (M09's typeDistribution) instead of importing
it — bloating the dispatch past the 1800 s window. The fix gave the model a clean handle on what each
dependency **exports** (briefs carry interfaces, not implementation) and made reimplementation a
deterministic mechanical failure ahead of the judge. M10 then built on the **first attempt** within
the **same 1800 s envelope** (no containment/grant relaxation), importing
`accumulateDist, serializeDist, classifyForDist` from `type-distribution.mjs` — exactly the symbols it
used to reinvent. M15 is a thin import-and-wire entry point exporting `BIBSS = { infer, project, adapters }`.

## Final per-module outcome (the 15-module finer plan)

| module | built | exec | attempts | containment |
|---|---|---|---|---|
| M01–M09, M11, M12 | yes | passed | 1–2 | docker |
| **M10** inference-engine | yes | passed | **1** | docker |
| **M13** jsonschema adapter | yes | passed | 2 | docker |
| **M14** cism-raw adapter | yes | passed | 1 | docker |
| **M15** public API `infer()` | yes | passed | 1 | docker |

## Cost (the composition tail, recorded — COMPOSITION-1 §5)

The loop now records actual `claude -p` spend per module (in the audit chain) and per run.

| module | $ | input tok | output tok |
|---|---|---|---|
| M10 | 1.5331 | 245,410 | 73,330 |
| M13 | 3.3755 | 510,122 | 168,642 |
| M14 | 0.6751 | 94,451 | 25,303 |
| M15 | 1.1710 | 233,506 | 41,975 |
| **tail total** | **6.7547** | 1,083,489 | 309,250 |

(10 CLI calls across the resumed tail run. M01–M09/M11/M12 were resumed from the prior 11/15 build.)

## The walls (each produced a shipped, tested loop fix)
1. **Full 71KB spec in every dispatch** → 30-min timeout → spec-trimming (c5a3d60)
2. **Cover-coarsening coverage mismatch** (§6.3 vs §6) → keep the planner's fine covers
3. **Self-generated bloat** (monolith + 71KB growing suite in every brief) → scale-pack:
   snapshot-trim to dependency closure + per-module test files + file-enforcement (76f8199)
4. **Rate-limit treated as failure + costly restarts** → rate-limit backoff + `--resume` (cb74b4a)
5. **The composition ceiling** (integration modules reimplement deps → bloat) → dependency
   **interfaces** in briefs + a mechanical **no-reimplementation** gate + cost instrumentation
   (COMPOSITION-1 / ADR-013). This is what carried the build from 11/15 to **15/15**.
