# TKT-008 — Implement domain models and calculations

**Status:** todo  
**Issue:** #8  
**Milestone:** M2 Client core  
**Depends on:** [TKT-001](TKT-001-scaffold-workspaces.md) (#1)

## Goal

Create the React-independent domain layer for sessions, validation, and financial results.

## Scope

- Add the client models from [docs/data-model.md](../docs/data-model.md), including local submission status.
- Calculate per-player buy-ins, cash-outs, and net result.
- Calculate session totals and the session balance.
- Calculate overall player results and highest-to-lowest ranking across sessions.
- Validate IDs, transaction types, positive integer amounts, ISO timestamps, session dates, and matching session IDs.
- Format an integer result with Hebrew grouping and an explicit `+`, `−`, or zero presentation.
- Cover the client calculation and validation rows in [docs/testing.md](../docs/testing.md) with Node's built-in test runner.

## Out of scope

- IndexedDB, HTTP, and visual components.
- Charts and historical filters.

## Implementation notes

- Buy-ins plus rebuys are total buy-ins. Net result is cash-outs minus that total.
- Do not coerce a non-zero session balance to zero.
- Ranking ties are broken by player name using Hebrew locale comparison.
- Keep this module importable from tests without starting Vite.

## Acceptance criteria

- [ ] The documented formulas pass automated tests, including a session that does not balance.
- [ ] A decimal, zero, or negative amount is rejected.
- [ ] A transaction referencing a different session ID is rejected.
- [ ] Formatting uses `he-IL` grouping and shows the sign for positive and negative values.
- [ ] Domain modules do not import React, IndexedDB, or the Fetch API.
