# TKT-022 — Verify the MVP acceptance criteria

**Status:** todo  
**Milestone:** M5 Acceptance  
**Depends on:** [TKT-007](TKT-007-server-tests.md), [TKT-017](TKT-017-transaction-history.md), [TKT-018](TKT-018-submit-retry.md), [TKT-020](TKT-020-session-summary.md), [TKT-021](TKT-021-statistics.md)

## Goal

Prove that the first version is usable under the UI specification's acceptance criteria.

## Scope

- Run `npm run typecheck` and `npm test`.
- Execute the complete manual checklist in [docs/testing.md](../docs/testing.md) at a 360px viewport.
- Record the result of each checklist item and any defect found.
- Fix defects that prevent a checklist item from passing, then rerun the affected item.

## Out of scope

- New features or deferred enhancements listed in [tickets/README.md](README.md).
- Deployment and cloud hosting.

## Implementation notes

- Use one fresh local database for the happy path and a separate controlled database for the `409` case.
- Verify behavior through the browser, including refresh and browser restart. A single static screenshot does not complete this ticket.
- Check the current evening, history, summary, and statistics after the same submission so their results agree.

## Acceptance criteria

- [ ] Automated typecheck and tests pass.
- [ ] All 14 manual checklist items pass.
- [ ] All 10 UI acceptance criteria in the backlog index have passing evidence.
- [ ] The happy-path submission exists once on the server and agrees across history, summary, and statistics.
- [ ] No checklist failure is left unresolved.
