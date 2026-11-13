# TKT-028 — Verify the Version 1.0 acceptance criteria

**Status:** todo  
**Issue:** #28  
**Milestone:** M6 Version 1.0: Historical Insights  
**Depends on:** [TKT-025](TKT-025-chart-cumulative-result.md) (#25), [TKT-026](TKT-026-chart-results-by-session.md) (#26), [TKT-027](TKT-027-chart-player-comparison.md) (#27)

## Goal

Prove that Version 1.0 historical insights work with the existing MVP flows and agree with underlying session transactions.

## Scope

- Extend [docs/testing.md](../docs/testing.md) with a short Version 1.0 checklist for group overview, player progression, and the three charts.
- Run `npm run typecheck` and `npm test`.
- Execute the new checklist at a 360px viewport and confirm MVP checklist items that touch history and statistics still pass.
- Record evidence for each new checklist item and fix defects that block a pass.

## Out of scope

- Features listed as deferred after Version 1.0 in [tickets/README.md](README.md).
- Deployment and cloud hosting.

## Implementation notes

- Confirm figures on overview, player history, and charts agree with the same submitted sessions.
- A single static screenshot does not complete chart readability checks; exercise the real screens.
- Definition of done: [docs/roadmap-v1.0.md](../docs/roadmap-v1.0.md) §6.

## Acceptance criteria

- [ ] Automated typecheck and tests pass.
- [ ] The Version 1.0 checklist items in `docs/testing.md` all pass at 360px.
- [ ] Group overview, player history progression, and the three charts agree with underlying session transactions.
- [ ] Existing MVP history and statistics checklist items still pass.
- [ ] No checklist failure is left unresolved.
