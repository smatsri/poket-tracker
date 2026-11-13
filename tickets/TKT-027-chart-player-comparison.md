# TKT-027 — Chart player comparison

**Status:** done  
**Issue:** #27  
**Milestone:** M6 Version 1.0: Historical Insights  
**Depends on:** [TKT-024](TKT-024-group-overview-enrichment.md) (#24), [TKT-025](TKT-025-chart-cumulative-result.md) (#25)

## Goal

Compare players' cumulative results on the group statistics screen with a simple chart.

## Scope

- Add a player-comparison chart driven by the same overall nets used for ranking.
- Place it on the statistics overview alongside the existing ranked list.
- Preserve ranking order rules from the data model, including the Hebrew name tie-breaker for the list.
- Keep mobile readability and agreement with listed overall results.
- Cover the comparison data mapping with automated tests.

## Out of scope

- Pairwise debt settlement and payment tracking.
- Filtering the comparison set beyond players who already appear in completed sessions.
- Replacing the ranked list with the chart.

## Implementation notes

- Reuse `rankOverallResults` / the enriched ranking presentation from TKT-024.
- The chart must not invent totals; every bar or point traces to a listed overall net.
- Product direction: [docs/roadmap-v1.0.md](../docs/roadmap-v1.0.md) §3.3 item 3.

## Acceptance criteria

- [x] The statistics overview shows a player-comparison chart when ranked players exist.
- [x] Chart values match the overall nets shown in the ranking list.
- [x] Players who never appear in a transaction remain excluded.
- [x] The chart remains usable at 360px width.
- [x] Automated tests cover the comparison data mapping.
