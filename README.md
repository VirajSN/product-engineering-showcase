# Viraj Nikam · Product Engineering Showcase

Selected work from **Job Hunt**, an AI-assisted Android product for preparing job applications, reviewing documents, handing off to an employer site and recording the outcome.

**[See the product case study →](https://viraj-nikam-product-engineer.virajnew117.chatgpt.site/job-hunt/)**

## My contribution

I framed the workflow, set system rules and acceptance criteria, and directed AI-assisted implementation and validation. This work reflects product strategy, system design, UX direction and an iterative build/test workflow. Implementation and documentation were developed with AI assistance.

## Start here

- [Workflow rules](src/domain/workflow.ts): preparation checks, renewed review after edits, import validation and explicit outcomes
- [Lifecycle](src/domain/lifecycle.ts): guarded handoff phases and derived readiness
- [Regression tests](src/domain/lifecycle.test.cjs): recovery, historical document snapshots and submission boundaries
- [Attention queue tests](src/domain/attention.test.cjs): overdue reminders, snoozing, deduplication and recoverable pending work
- [Design decisions](docs/architecture/ADR-001-human-handoff-boundary.md): why opening an employer page never means “submitted”

## What this demonstrates

1. **Human-controlled submission.** A handoff moves through saving, saved and opened states. Submission needs an explicit outcome, with user-reported evidence clearly labeled.
2. **Review follows change.** Changing answers or document versions invalidates the earlier kit review. A pending handoff retains its original snapshot.
3. **Recoverable work.** Pending work stays reachable after interruption, snoozing or a display-mode change. Invalid imports and conflicting identities are rejected or flagged.
4. **Time-aware reminders.** Calendar edits preserve local wall-clock time across daylight-saving changes. Reminders here are in-app state; they do not schedule push notifications.

## Run the selected code

Use Node.js 22.18+ and npm:

```sh
npm ci
npm run check
```

The check runs strict TypeScript validation and **37 regression tests** against the included source. Verified on Node.js 24.19.0 with TypeScript 6.0.3 on October 13, 2026. Tests use fictitious records and example.com URLs. No accounts, credentials, device or backend are required.

## Scope and current boundaries

This repository is a runnable **domain-logic excerpt**, not an installable Android app. The larger project uses React Native, Expo, TypeScript and SQLite. Its UI, native file APIs, SQLite repository and device tests are outside this export.

The source checkpoint contains implemented reliability changes and a manual preparation-to-outcome flow. The redesigned native screens were still proposals at that checkpoint. Integrated preparation, live CRM synchronization and automatic employer submission are not implemented here. Host tests do not establish Android behavior, accessibility certification, user research outcomes or production readiness.

The portfolio presents the broader visual case study and dated evidence. See [scope and verification](docs/SCOPE.md) for how the evidence is separated and [source provenance](docs/PROVENANCE.md) for export details.

## License and attribution

The source repository carries an MIT license with the Expo copyright notice. That notice is preserved in [LICENSE](LICENSE). No independent authorship of third-party framework code is claimed. Framework source, external assets and private project history are not included.
