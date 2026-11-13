# TKT-024 — Enrich the group statistics overview

**Status:** todo  
**Issue:** #24  
**Milestone:** M6 Version 1.0: Historical Insights  
**Depends on:** [TKT-023](TKT-023-player-history-progression.md) (#23)

## Goal

Make the group statistics screen a clearer overview of participation and cumulative results without adding charts yet.

## Scope

- Keep the completed-evening count, transaction count, and ranking by cumulative net result.
- Show each ranked player's evenings-played count next to their overall result.
- Reuse the shared evenings-played / series helpers from TKT-023 where they already exist.
- Preserve empty, loading, and retry states on סיכומים.

## Out of scope

- Charts.
- Date filters and search.
- New API endpoints or stored aggregate tables.
- Changing ranking rules.

## Implementation notes

- "Overall group results" for this ticket means the existing ranking plus visible participation (evenings played) for each ranked player.
- Time-based change for the group is delivered later by the chart tickets, not by redesigning this list.
- Product direction: [docs/roadmap-v1.0.md](../docs/roadmap-v1.0.md) §3.1.

## Acceptance criteria

- [ ] Session and transaction counts remain correct for the returned sessions.
- [ ] Each ranked player row shows that player's evenings-played count.
- [ ] Ranking order and overall nets remain unchanged from TKT-021 rules.
- [ ] The empty state still appears when no completed sessions exist.
- [ ] Automated tests cover the enriched ranking rows.
