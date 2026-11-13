# TKT-026 — Chart results by session

**Status:** done  
**Issue:** #26  
**Milestone:** M6 Version 1.0: Historical Insights  
**Depends on:** [TKT-024](TKT-024-group-overview-enrichment.md) (#24), [TKT-025](TKT-025-chart-cumulative-result.md) (#25)

## Goal

Show profit and loss across individual completed evenings with a second chart that reuses the existing session calculations.

## Scope

- Add a results-by-session chart on the group statistics overview.
- Derive each point from the client-calculated session balance for completed evenings returned by `GET /api/sessions`.
- Keep the existing counts and ranking list; the chart supports the overview.
- Reuse the chart approach introduced in TKT-025 where practical.
- Cover the chart data mapping with automated tests.

## Out of scope

- Per-hand or per-transaction charts.
- Editing historical sessions.
- Date-range filters in the UI (API filters may remain unused).

## Implementation notes

- Session balance remains `sessionCashOuts - sessionBuyIns` from [docs/data-model.md](../docs/data-model.md).
- Order evenings chronologically for the chart even if other lists stay newest first.
- Product direction: [docs/roadmap-v1.0.md](../docs/roadmap-v1.0.md) §3.3 item 2.

## Acceptance criteria

- [x] The statistics overview shows a results-by-session chart when at least one completed evening exists.
- [x] Each chart value matches the client-calculated session balance for that evening.
- [x] The chart remains usable at 360px width.
- [x] Existing overview counts and ranking still render correctly.
- [x] Automated tests cover the session series mapping.
