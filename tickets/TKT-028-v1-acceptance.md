# TKT-028 — Verify the Version 1.0 acceptance criteria

**Status:** done  
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

- [x] Automated typecheck and tests pass.
- [x] The Version 1.0 checklist items in `docs/testing.md` all pass at 360px.
- [x] Group overview, player history progression, and the three charts agree with underlying session transactions.
- [x] Existing MVP history and statistics checklist items still pass.
- [x] No checklist failure is left unresolved.

## Checklist evidence

Ran at a 360px viewport against a fresh database, `data/tkt-028.sqlite`. `npm run typecheck` and `npm test` passed first: 84 client tests and 49 server tests.

Two completed evenings were submitted through the app. אבי and דנה played; גל was created and left without transactions.

Evening `141d0b3a-9e0b-48ba-b824-370054618e58`: buy-ins 200, cash-outs 220, balance +20, אבי +80, דנה −60. Evening `dcb3e66f-a306-456d-b004-ca187391dce0`: buy-ins 150, cash-outs 120, balance −30, אבי −20, דנה −10. Each session is stored once.

1. Pass. סיכומים shows 2 evenings and 8 transactions. אבי ranks above דנה at +60 and −70, and each row shows 2 evenings. גל is absent.
2. Pass. אבי's history shows 2 evenings, cumulative +80 then +60, and a final +60 that matches the overall result. דנה shows −60 then −70, matching −70 overall.
3. Pass. The cumulative chart fits the 360px width (296px wide, no overflow). Its accessible points are 80 then 60 for אבי, and the label is the final +60. The line slopes down between those two points.
4. Pass. The results-by-session chart fits the same width. The older evening is a green +20 bar and the newer evening is a red −30 bar, matching each session balance.
5. Pass. The comparison chart fits the same width. אבי is +60 and דנה is −70, matching the ranking. גל does not appear.
6. Pass. History lists the −30 evening above the +20 evening. Each summary matches its transaction list: 150/120/−30 with אבי −20 and דנה −10, and 200/220/+20 with אבי +80 and דנה −60.
7. Pass. Statistics still count 2 evenings and 8 transactions and rank +60 above −70. Positive values use `#249B45` and `+`. Negative values use `#D94B4B` and `−`.
