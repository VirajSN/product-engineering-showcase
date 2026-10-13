# Scope and verification

## Included and tested here

The selected Job Hunt TypeScript domain modules and their existing tests cover preparation readiness, required-file review flags, explicit outcomes, immutable handoff snapshots, import checks, application status guards, the Today attention queue and reminder date/time logic.

On October 13, 2026, this standalone export passed strict TypeScript checking and all 37 included Node regression tests. These are executable host-side checks. The test-only loader transpiles the actual included TypeScript rather than a second handwritten implementation. Run `npm ci && npm run check` from the repository root.

## Broader project evidence

The underlying Android source checkpoint dated October 11, 2026 records implemented attention-queue, snooze, blocker-draft and terminal-record reliability changes. It also records fictional emulator exercises for PDF rendering, review invalidation, cancellation recovery, export readback and restart retention. Those historical results were not rerun for this public export and their private captures and receipts are not included.

Earlier October 6–7 native evidence in the portfolio is separately dated and limited. The October 11 emulator checkpoint does not establish that earlier physical-device PDF issues are fixed on every device or provider.

The [public portfolio case study](https://viraj-nikam-product-engineer.virajnew117.chatgpt.site/job-hunt/) gives visual context. This repository does not mirror the portfolio's photographs, screenshots, recordings, résumé or personal information.

## Limits

- This export has no UI, database adapter, native filesystem adapter or employer connection.
- A string representing a verified folder in a unit test does not verify a real Android folder or PDF viewer.
- Imported data is runtime-validated in several paths; TypeScript types alone do not prove all incoming JSON is safe. This is not a security audit.
- `manualOutcome` relies on caller-level controls: it can replace an existing same-job pending snapshot and does not itself reject a terminal application. The selected tests do not establish protection across every entry point. This is an identified hardening opportunity, left unchanged from the source export.
- Persisted readiness, pending handoff and application outcome are intentionally distinct concepts; the model is not a wholesale discriminated-union redesign.
- Redesigned native screens were proposals at the source checkpoint. User research and broader product development remained future work.
- No production adoption, placement outcomes, performance benchmark, independent coding assessment or accessibility certification is claimed.

## Why keep the boundary explicit?

The product should help a person prepare and resume work without inventing progress. Review can become stale, file saving can fail, and an opened page is not proof of submission. The two original architecture decision records in this repository explain those choices. They are historical design records; the executable export and this scope note define what is verified here today.
