# ADR-002: One typed workflow model

## Context
Production JS, manual declarations and an unused example domain drifted apart. Arbitrary status strings obscured transitions.

## Alternatives
Retain declarations; rewrite the UI/domain at once; incrementally type the production implementation.

## Decision
Use domain/types.ts and workflow.ts as the single strict TypeScript model, with loop.ts re-exporting for existing callers. A typed lifecycle derives readiness from blockers and maps persisted statuses and pending phases. advanceHandoff validates phase transitions; updateRecord guards status changes. Keep schema 6/revision 2 and existing migrations.

## Tradeoffs and consequences
The persisted wire format stays compatible; it is not a wholesale discriminated-union migration. Pending and record states remain separate. JSON import validation is necessary despite TS. Tests transpile the same production source in memory, replacing the obsolete example suite. Additional schema validation and structured event types remain future work; new event metadata is only a compatible foundation, with legacy text preserved.

