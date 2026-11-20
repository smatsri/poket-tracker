# Ticket backlog

A ticket starts as `todo`, moves to `in-progress` when work starts, and becomes `done` only when its acceptance criteria pass. Each ticket is sized as one focused change.

Each ticket is also a GitHub issue. `**Issue:**` is that issue, and the [poker tracker project](https://github.com/users/smatsri/projects/8) tracks board status. The ticket file is the spec. The GitHub issue body is only a link to that file, not a copy of the description or acceptance criteria.

When a ticket becomes `done`, set that status in the ticket file, then push a commit to `dev` or the default branch whose message contains `Closes #<issue>`. Use the GitHub issue number from `**Issue:**`, not the ticket id. A push to `dev` closes those issues from the commit message. A push to the default branch does the same through GitHub's own keyword. Closing the issue moves its project card to Done. Milestones are GitHub milestones, and `Depends on` is a blocked-by link.

The authoritative contract is [docs/api/openapi.yaml](../docs/api/openapi.yaml). Product behavior is locked in [docs/architecture.md](../docs/architecture.md), [docs/data-model.md](../docs/data-model.md), and [docs/testing.md](../docs/testing.md). Production hosting is locked in [docs/deployment.md](../docs/deployment.md). Version 1.0 product direction is in [docs/roadmap-v1.0.md](../docs/roadmap-v1.0.md).

## Milestones

| Milestone | Tickets | Outcome | Status |
| --- | --- | --- | --- |
| M0 Foundation | TKT-001 | Both packages install, typecheck, and start | done |
| M1 Server | TKT-002–TKT-007 | Reliable player and session API | done |
| M2 Client core | TKT-008–TKT-011 | Offline-safe evening and submission rules | done |
| M3 Live evening | TKT-012–TKT-018 | Hebrew mobile flow used during a game | done |
| M4 Review | TKT-019–TKT-021 | History, summary, and statistics | done |
| M5 Acceptance | TKT-022 | Complete MVP checklist | done |
| M6 Version 1.0: Historical Insights | TKT-023–TKT-028 | Group overview, player progression, and charts | done |
| M7 Contract hardening | TKT-029–TKT-032 | The locked contracts hold for the cases the reviews found | done |
| M8 Production deployment | TKT-033–TKT-040 | The app is reachable on a phone through Cloud Run and Neon | done |
| M9 Evening usability | TKT-041–TKT-048 | A live evening is faster to run, and the recap is easier to check | done |
| M10 Follow-ups | TKT-049–TKT-055 | The recap is easier to read, a note can ride with the evening, and a closed evening can be archived or deleted | todo |

M0–M9 are done. M10 is open. Hosting stays locked in [docs/deployment.md](../docs/deployment.md). Later product work should reuse existing client calculations and `GET /api/sessions`. Do not add analytics endpoints unless a later ticket proves they are required.

M9 is specified in [docs/roadmap-m9.md](../docs/roadmap-m9.md). M10 is specified in [docs/roadmap-m10.md](../docs/roadmap-m10.md). Architecture, the data model, and OpenAPI stay the current contract until the ticket that changes them lands.

These review notes stay out of the backlog:

- Stored transactions are ordered by timestamp text. The client sorts by UTC instant before display.
- The server listens on every interface. Operator authentication is M8, in [docs/deployment.md](../docs/deployment.md).
- A `409` leaves the evening pending, with no edit and no new evening. That is locked decision 14 in [docs/architecture.md](../docs/architecture.md).

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
| [TKT-027](TKT-027-chart-player-comparison.md) | Chart player comparison | done | TKT-024, TKT-025 |
| [TKT-028](TKT-028-v1-acceptance.md) | Verify the Version 1.0 acceptance criteria | done | TKT-025, TKT-026, TKT-027 |
| [TKT-029](TKT-029-single-flight-save.md) | Ignore a second save while one is in progress | done | None |
| [TKT-030](TKT-030-evening-load-failure.md) | Show a failed evening load instead of an empty evening | done | None |
| [TKT-031](TKT-031-malformed-route.md) | Ignore a malformed history or statistics path | done | None |
| [TKT-032](TKT-032-session-id-conflict.md) | Cover a concurrent session-id conflict | done | None |
| [TKT-033](TKT-033-postgresql-access.md) | Replace SQLite with PostgreSQL | done | None |
| [TKT-034](TKT-034-concurrent-session-submit.md) | Prove concurrent session submits on Postgres | done | TKT-033 |
| [TKT-035](TKT-035-production-http-host.md) | Serve the production client from Express | done | None |
| [TKT-036](TKT-036-operator-basic-auth.md) | Require the operator password | done | TKT-035 |
| [TKT-037](TKT-037-production-image.md) | Build the production container image | done | TKT-033, TKT-035, TKT-036 |
| [TKT-038](TKT-038-first-cloud-deploy.md) | Deploy Cloud Run and Neon | done | TKT-037 |
| [TKT-039](TKT-039-github-actions-deploy.md) | Deploy from GitHub Actions | done | TKT-034, TKT-037, TKT-038 |
| [TKT-040](TKT-040-backup-restore.md) | Verify a database restore | done | TKT-038 |
| [TKT-041](TKT-041-player-names.md) | Keep player names visible | done | None |
| [TKT-042](TKT-042-close-to-summary.md) | Open the summary after a confirmed close | done | None |
| [TKT-043](TKT-043-add-action-sheet.md) | Shorten the add-action sheet | done | None |
| [TKT-044](TKT-044-bulk-buy-in.md) | Add the same amount for several players | done | TKT-043 |
| [TKT-045](TKT-045-session-name-location.md) | Name and locate an evening | done | None |
| [TKT-046](TKT-046-history-metrics.md) | Show the history gap | done | None |
| [TKT-047](TKT-047-player-rename-delete.md) | Rename a player and delete an unused one | done | None |
| [TKT-048](TKT-048-session-cache.md) | Cache closed sessions for display | done | TKT-045 |
| [TKT-049](TKT-049-amount-focus.md) | Leave the amount field unfocused after a save | todo | None |
| [TKT-050](TKT-050-summary-by-profit.md) | Sort the summary by profit | todo | None |
| [TKT-051](TKT-051-history-biggest-winner.md) | Show the biggest winner on a history card | todo | None |
| [TKT-052](TKT-052-history-layout.md) | Lay out the history page | todo | None |
| [TKT-053](TKT-053-app-header.md) | Restyle the header and screen title | todo | None |
| [TKT-054](TKT-054-evening-note.md) | Add a note to the current evening | todo | None |
| [TKT-055](TKT-055-archive-delete-session.md) | Archive or delete a closed evening | done | None |

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

### M9 Evening usability

| Outcome | Tickets |
| --- | --- |
| Player names stay visible | TKT-041 |
| Confirmed close opens the summary, and the next evening is easy to start | TKT-042 |
| Faster add-action sheet, default amount, and currency label | TKT-043 |
| One amount for several players | TKT-044 |
| Optional evening name and location | TKT-045 |
| History shows money in, money out, and the gap | TKT-046 |
| Rename a player, and delete one with no transactions | TKT-047 |
| Closed sessions render from a local cache | TKT-048 |

### M10 Follow-ups

| Outcome | Tickets |
| --- | --- |
| Adding an action does not open the number keyboard | TKT-049 |
| The summary lists players by profit | TKT-050 |
| A history card names the biggest winner | TKT-051 |
| The history page is a readable card list | TKT-052 |
| The header carries the screen title | TKT-053 |
| The current evening can store one note | TKT-054 |
| A closed evening can be archived or deleted | TKT-055 |

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
- Editing a closed evening's name, location, date, note, or transactions. Archive and delete are M10, in TKT-055
- Player accounts and multiple application users. Operator access for the hosted app is M8, in [docs/deployment.md](../docs/deployment.md)
- Multi-device collaboration and real-time sync. M9 may cache closed sessions for display; the server stays the source of truth. Full offline history stays deferred
- Attendance without a transaction
- Debt management and payments between players
- Scheduling and attendance for future evenings
- Hand tracking, strategy tools, chat, and AI features
- Pagination, and hosting beyond the single service in [docs/deployment.md](../docs/deployment.md)
- Multiple independent poker groups
