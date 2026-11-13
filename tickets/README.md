# Ticket backlog

A ticket starts as `todo`, moves to `in-progress` when work starts, and becomes `done` only when its acceptance criteria pass. Each ticket is sized as one focused change.

Each ticket is also a GitHub issue. `**Issue:**` is that issue, and the [poker tracker project](https://github.com/users/smatsri/projects/8) tracks board status. The ticket file is the spec. The GitHub issue body is only a link to that file, not a copy of the description or acceptance criteria.

When a ticket becomes `done`, set that status in the ticket file, then push a commit to the default branch whose message contains `Closes #<issue>`. Use the GitHub issue number from `**Issue:**`, not the ticket id. Closing the issue moves its project card to Done. Milestones are GitHub milestones, and `Depends on` is a blocked-by link.

The authoritative contract is [docs/api/openapi.yaml](../docs/api/openapi.yaml). Product behavior is locked in [docs/architecture.md](../docs/architecture.md), [docs/data-model.md](../docs/data-model.md), and [docs/testing.md](../docs/testing.md). Version 1.0 product direction is in [docs/roadmap-v1.0.md](../docs/roadmap-v1.0.md).

## Milestones

| Milestone | Tickets | Outcome | Status |
| --- | --- | --- | --- |
| M0 Foundation | TKT-001 | Both packages install, typecheck, and start | done |
| M1 Server | TKT-002–TKT-007 | Reliable player and session API | done |
| M2 Client core | TKT-008–TKT-011 | Offline-safe evening and submission rules | done |
| M3 Live evening | TKT-012–TKT-018 | Hebrew mobile flow used during a game | done |
| M4 Review | TKT-019–TKT-021 | History, summary, and statistics | done |
| M5 Acceptance | TKT-022 | Complete MVP checklist | done |
| M6 Version 1.0: Historical Insights | TKT-023–TKT-028 | Group overview, player progression, and charts | open |

M1 and M2 could proceed in parallel after TKT-001. M6 builds on the completed MVP statistics and history screens. Reuse existing client calculations and `GET /api/sessions`; do not add analytics endpoints unless a later ticket proves they are required.

## Sequence

| Ticket | Title | Status | Depends on |
| --- | --- | --- | --- |
| [TKT-001](TKT-001-scaffold-workspaces.md) | Scaffold the client and server workspaces | done | None |
| [TKT-002](TKT-002-sqlite-schema.md) | Initialize SQLite and enforce the schema | done | TKT-001 |
| [TKT-003](TKT-003-validation-errors.md) | Add validation and the JSON error pipeline | done | TKT-001 |
| [TKT-004](TKT-004-player-endpoints.md) | Implement player list and create | done | TKT-002, TKT-003 |
| [TKT-005](TKT-005-submit-session.md) | Submit a session atomically and idempotently | done | TKT-002, TKT-003, TKT-004 |
| [TKT-006](TKT-006-read-sessions.md) | Retrieve one session and list sessions | done | TKT-005 |
| [TKT-007](TKT-007-server-tests.md) | Cover server integrity with automated tests | done | TKT-004, TKT-005, TKT-006 |
| [TKT-008](TKT-008-domain-calculations.md) | Implement domain models and calculations | done | TKT-001 |
| [TKT-009](TKT-009-indexeddb.md) | Persist the active session in IndexedDB | done | TKT-008 |
| [TKT-010](TKT-010-api-client.md) | Add the HTTP API layer | done | TKT-001, TKT-008 |
| [TKT-011](TKT-011-submission-state.md) | Implement submission and recovery rules | done | TKT-009, TKT-010 |
| [TKT-012](TKT-012-rtl-shell.md) | Establish the Hebrew RTL application shell | done | TKT-001 |
| [TKT-013](TKT-013-player-management.md) | Load, cache, and create players | done | TKT-009, TKT-010, TKT-012 |
| [TKT-014](TKT-014-current-evening.md) | Build the current-evening screen | done | TKT-008, TKT-009, TKT-011, TKT-012 |
| [TKT-015](TKT-015-add-transaction.md) | Record a transaction quickly | done | TKT-013, TKT-014 |
| [TKT-016](TKT-016-correct-transactions.md) | Correct transactions before submission | done | TKT-015 |
| [TKT-017](TKT-017-transaction-history.md) | Show full transaction history | done | TKT-014, TKT-016 |
| [TKT-018](TKT-018-submit-retry.md) | Submit the evening and retry safely | done | TKT-006, TKT-011, TKT-014, TKT-016 |
| [TKT-019](TKT-019-session-history.md) | Browse previous evenings | done | TKT-006, TKT-010, TKT-012 |
| [TKT-020](TKT-020-session-summary.md) | Review a submitted evening | done | TKT-008, TKT-019 |
| [TKT-021](TKT-021-statistics.md) | Show cross-evening statistics | done | TKT-008, TKT-019 |
| [TKT-022](TKT-022-mvp-acceptance.md) | Verify the MVP acceptance criteria | done | TKT-007, TKT-017, TKT-018, TKT-020, TKT-021 |
| [TKT-023](TKT-023-player-history-progression.md) | Deepen player history with progression | done | TKT-021 |
| [TKT-024](TKT-024-group-overview-enrichment.md) | Enrich the group statistics overview | done | TKT-023 |
| [TKT-025](TKT-025-chart-cumulative-result.md) | Chart a player's cumulative result over time | done | TKT-023 |
| [TKT-026](TKT-026-chart-results-by-session.md) | Chart results by session | done | TKT-024, TKT-025 |
| [TKT-027](TKT-027-chart-player-comparison.md) | Chart player comparison | todo | TKT-024, TKT-025 |
| [TKT-028](TKT-028-v1-acceptance.md) | Verify the Version 1.0 acceptance criteria | todo | TKT-025, TKT-026, TKT-027 |

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
| Cross-evening statistics and ranking | TKT-021 |
| Player historical progression | TKT-023 |
| Enriched group overview | TKT-024 |
| Historical insight charts | TKT-025, TKT-026, TKT-027 |

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

These items stay outside Version 1.0:

- Additional charts beyond the three Version 1.0 views, plus filters, search, and advanced analytics
- Editing or deleting a session after server confirmation
- Player accounts, authentication, and multiple application users
- Multi-device collaboration, real-time sync, and offline access to the full history
- Attendance without a transaction
- Debt management and payments between players
- Scheduling and attendance for future evenings
- Hand tracking, strategy tools, chat, and AI features
- Pagination and cloud infrastructure
- Multiple independent poker groups
