# Ticket backlog

All tickets are `todo`. A ticket moves to `in-progress` when work starts and to `done` only when its acceptance criteria pass. Each ticket is sized as one focused change.

The authoritative contract is [docs/api/openapi.yaml](../docs/api/openapi.yaml). Product behavior is locked in [docs/architecture.md](../docs/architecture.md), [docs/data-model.md](../docs/data-model.md), and [docs/testing.md](../docs/testing.md).

## Milestones

| Milestone | Tickets | Outcome |
| --- | --- | --- |
| M0 Foundation | TKT-001 | Both packages install, typecheck, and start |
| M1 Server | TKT-002–TKT-007 | Reliable player and session API |
| M2 Client core | TKT-008–TKT-011 | Offline-safe evening and submission rules |
| M3 Live evening | TKT-012–TKT-018 | Hebrew mobile flow used during a game |
| M4 Review | TKT-019–TKT-021 | History, summary, and statistics |
| M5 Acceptance | TKT-022 | Complete MVP checklist |

M1 and M2 can proceed in parallel after TKT-001. M3 submission needs M1 and M2. M4 needs session retrieval and client calculations.

## Sequence

| Ticket | Title | Depends on |
| --- | --- | --- |
| [TKT-001](TKT-001-scaffold-workspaces.md) | Scaffold the client and server workspaces | None |
| [TKT-002](TKT-002-sqlite-schema.md) | Initialize SQLite and enforce the schema | TKT-001 |
| [TKT-003](TKT-003-validation-errors.md) | Add validation and the JSON error pipeline | TKT-001 |
| [TKT-004](TKT-004-player-endpoints.md) | Implement player list and create | TKT-002, TKT-003 |
| [TKT-005](TKT-005-submit-session.md) | Submit a session atomically and idempotently | TKT-002, TKT-003, TKT-004 |
| [TKT-006](TKT-006-read-sessions.md) | Retrieve one session and list sessions | TKT-005 |
| [TKT-007](TKT-007-server-tests.md) | Cover server integrity with automated tests | TKT-004, TKT-005, TKT-006 |
| [TKT-008](TKT-008-domain-calculations.md) | Implement domain models and calculations | TKT-001 |
| [TKT-009](TKT-009-indexeddb.md) | Persist the active session in IndexedDB | TKT-008 |
| [TKT-010](TKT-010-api-client.md) | Add the HTTP API layer | TKT-001, TKT-008 |
| [TKT-011](TKT-011-submission-state.md) | Implement submission and recovery rules | TKT-009, TKT-010 |
| [TKT-012](TKT-012-rtl-shell.md) | Establish the Hebrew RTL application shell | TKT-001 |
| [TKT-013](TKT-013-player-management.md) | Load, cache, and create players | TKT-009, TKT-010, TKT-012 |
| [TKT-014](TKT-014-current-evening.md) | Build the current-evening screen | TKT-008, TKT-009, TKT-011, TKT-012 |
| [TKT-015](TKT-015-add-transaction.md) | Record a transaction quickly | TKT-013, TKT-014 |
| [TKT-016](TKT-016-correct-transactions.md) | Correct transactions before submission | TKT-015 |
| [TKT-017](TKT-017-transaction-history.md) | Show full transaction history | TKT-014, TKT-016 |
| [TKT-018](TKT-018-submit-retry.md) | Submit the evening and retry safely | TKT-006, TKT-011, TKT-014, TKT-016 |
| [TKT-019](TKT-019-session-history.md) | Browse previous evenings | TKT-006, TKT-010, TKT-012 |
| [TKT-020](TKT-020-session-summary.md) | Review a submitted evening | TKT-008, TKT-019 |
| [TKT-021](TKT-021-statistics.md) | Show cross-evening statistics | TKT-008, TKT-019 |
| [TKT-022](TKT-022-mvp-acceptance.md) | Verify the MVP acceptance criteria | TKT-007, TKT-017, TKT-018, TKT-020, TKT-021 |

## Requirement coverage

| Must-have | Tickets |
| --- | --- |
| Start a new session | TKT-009, TKT-011, TKT-014 |
| Load and create players | TKT-004, TKT-013 |
| Record buy-ins, rebuys, and cash-outs | TKT-015 |
| Edit and delete transactions | TKT-016 |
| Display live player balances | TKT-008, TKT-014 |
| Display recent activity | TKT-014 |
| Persist the session locally | TKT-009 |
| Submit completed sessions | TKT-005, TKT-018 |
| Retry failed submissions safely | TKT-005, TKT-011, TKT-018 |
| Browse previous sessions | TKT-006, TKT-019 |
| View session summaries | TKT-020 |

| UI acceptance criterion | Tickets |
| --- | --- |
| 1. A new evening can be started from a phone | TKT-012, TKT-014, TKT-022 |
| 2. A transaction can be recorded in a few taps | TKT-015, TKT-022 |
| 3. Transactions survive refresh and browser restart | TKT-009, TKT-022 |
| 4. Player balances update immediately | TKT-008, TKT-014, TKT-022 |
| 5. Transactions can be corrected before submission | TKT-016, TKT-022 |
| 6. A completed session can be submitted | TKT-005, TKT-018, TKT-022 |
| 7. Failed submissions retry without loss or duplication | TKT-005, TKT-011, TKT-018, TKT-022 |
| 8. Previous sessions can be opened and reviewed | TKT-019, TKT-020, TKT-022 |
| 9. The application works naturally in Hebrew and RTL | TKT-012, TKT-022 |
| 10. The main flow is comfortable during a live evening | TKT-015, TKT-016, TKT-018, TKT-022 |

## Deferred work

Version 1 does not include these items, and this backlog does not schedule them:

- Charts, filters, search, and advanced analytics
- Editing or deleting a session after server confirmation
- Player accounts, authentication, and multiple application users
- Multi-device collaboration, real-time sync, and offline access to the full history
- Attendance without a transaction
- Hand tracking, strategy tools, chat, and AI features
- Pagination and cloud infrastructure
