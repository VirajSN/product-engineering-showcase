# ADR-001: Human handoff boundary

## Context
Employer opening is not evidence of submission. Saving can fail or be interrupted.

## Alternatives
Automatically submit employer forms; infer submission from opening; retain an explicit human outcome.

## Decision
Retain the human outcome. Handoff transitions require saving then a verified folder before opening. Submission remains the explicit outcome path, with user-reported or existing CRM evidence. Failures preserve pending recovery state and the historical kit.

## Tradeoffs and consequences
The user must return to confirm an outcome. No live employer receipt verification is implied. Native save/read-back gates remain in handoff.ts and still need device acceptance.

