# TKT-023 — Deepen player history with progression

**Status:** done  
**Issue:** #23  
**Milestone:** M6 Version 1.0: Historical Insights  
**Depends on:** [TKT-021](TKT-021-statistics.md) (#21)

## Goal

Make an individual player's history show how many evenings they played and how their cumulative result progressed across those evenings.

## Scope

- Extend the player statistics presentation with an evenings-played count.
- Derive a chronological series of that player's per-evening net results and a running cumulative total after each evening.
- Show the evenings-played count and the cumulative progression on the existing player history screen (`/stats/{playerId}`).
- Keep using `GET /api/sessions` and client-side calculations. Do not add an analytics endpoint.
- Cover the new series math and presentation with automated tests.

## Out of scope

- Charts and chart libraries.
- Changes to the group ranking list layout beyond what this ticket needs for shared helpers.
- Date filters, search, and editing completed sessions.

## Implementation notes

- Reuse `calculatePlayerResults` and the existing player-history path in [client/src/features/sessions/statistics.ts](../client/src/features/sessions/statistics.ts).
- Chronological order is oldest first for the cumulative series. The evening list may stay newest first if that remains clearer on mobile.
- Overall cumulative profit/loss must still equal the sum of that player's per-session nets.
- Prefer a small pure helper next to the existing statistics presentation rather than a new server contract.
- Product direction: [docs/roadmap-v1.0.md](../docs/roadmap-v1.0.md) §3.2.

## Acceptance criteria

- [x] The player history shows how many completed evenings include that player.
- [x] The screen exposes a chronological cumulative progression that matches summing per-evening nets in date order.
- [x] The final cumulative value equals the existing overall result for that player.
- [x] Players with no attended evenings still show the existing missing-player state.
- [x] Automated tests cover empty history, a single evening, and multiple evenings with mixed wins and losses.
