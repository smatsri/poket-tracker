# TKT-025 — Chart a player's cumulative result over time

**Status:** todo  
**Issue:** #25  
**Milestone:** M6 Version 1.0: Historical Insights  
**Depends on:** [TKT-023](TKT-023-player-history-progression.md) (#23)

## Goal

Show how one player's cumulative result changes from evening to evening with a clear mobile chart.

## Scope

- Add the first chart dependency only if needed for a simple, maintainable mobile chart.
- Render a cumulative-result-over-time chart on the player history screen using the series from TKT-023.
- Keep the existing numeric overall result and evening list; the chart supports them, it does not replace them.
- Make the chart readable at a 360px viewport with Hebrew RTL chrome around it.
- Test the chart data mapping; keep financial math in the existing pure helpers.

## Out of scope

- The other Version 1.0 chart types (session results and player comparison).
- Advanced analytics, zoom, brushing, and export.
- Server-side chart or analytics endpoints.

## Implementation notes

- Prefer clarity over visual complexity. Avoid decorative effects that fight RTL or small screens.
- Values shown by the chart must agree with the cumulative series and overall result already tested in TKT-023.
- Product direction: [docs/roadmap-v1.0.md](../docs/roadmap-v1.0.md) §3.3 item 1.

## Acceptance criteria

- [ ] The player history screen shows a cumulative result chart when the player has at least one evening.
- [ ] Chart points match the chronological cumulative series from TKT-023.
- [ ] The chart remains usable at 360px width inside the existing Hebrew shell.
- [ ] No new API endpoint is introduced.
- [ ] Automated tests cover the data passed into the chart for representative series.
