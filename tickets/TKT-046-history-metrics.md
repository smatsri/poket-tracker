# TKT-046 — Show the history gap

**Status:** todo  
**Issue:** #47  
**Milestone:** M9 Evening usability  
**Depends on:** None

## Goal

Make a history card show whether the evening's money in and money out agree.

## Scope

- Lead each history card with money in, money out, and the gap.
- Money in is the existing session buy-in total, including rebuys. Money out is the session cash-out total. The gap is the session balance, with the existing sign and color.
- Show the count of money-in transactions and the count of cash-out transactions as secondary facts. Those counts are independent.
- Keep the player count.
- Leave the results-by-session chart on session balance.
- Update the history description in [docs/testing.md](../docs/testing.md) so the manual check names these facts.
- Cover a balanced evening, a non-zero gap, and unequal counts with automated tests.

## Out of scope

- Removing the session balance from statistics or charts.
- Filtering or searching history.
- Session name and location. That is TKT-045.

## Implementation notes

- Product decision 9 in [docs/roadmap-m9.md](../docs/roadmap-m9.md).
- Reuse `sessionBuyIns`, `sessionCashOuts`, and `sessionBalance`. Do not store the gap.
- Hebrew labels: `סך שנכנס`, `סך שיצא`, and `פער` for the amounts. Use `מספר כניסות` and `מספר יציאות` for the counts, where a count of entries includes buy-in and rebuy.

## Acceptance criteria

- [ ] Each history card shows money in, money out, and the signed gap from the session's transactions.
- [ ] A fully balanced evening shows a zero gap, and an evening with more money in than out shows a negative gap.
- [ ] The entry count and the exit count can differ, and both are visible.
- [ ] The results-by-session chart still uses session balance.
- [ ] Automated tests cover a zero gap, a non-zero gap, and unequal counts.
