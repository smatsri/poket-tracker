# TKT-052 — Lay out the history page

**Status:** todo  
**Issue:** #54  
**Milestone:** M10 Follow-ups  
**Depends on:** None

## Goal

Make a past evening readable on a phone without dropping the facts the card already shows.

## Scope

- Render each evening as one card, using the existing surface, radius, shadow, and type scale from [docs/specs/Visual Design Language.md](../docs/specs/Visual%20Design%20Language.md).
- Put the heading first: the evening name, or the date when the name is absent.
- When a name is present, show the date and the location as secondary text. Show the location only when it is set.
- When the entry includes a biggest winner, show that line with the heading.
- Make the gap the prominent amount. Show money in and money out after it. Keep the entry and exit counts muted, and keep the player count.
- Keep the whole card as the link to that evening's summary.
- Stay RTL and readable at 360px width without a new palette.
- Update the history row in the manual MVP checklist to describe this order.
- Keep the automated tests that lock the existing facts. Extend them if the view model gains a display order.

## Out of scope

- Choosing the biggest winner. That is TKT-051. This ticket only places the fact when it is already on the entry.
- Archive, delete, search, or filters.
- A new card for each money figure.

## Implementation notes

- Product decision 4 in [docs/roadmap-m10.md](../docs/roadmap-m10.md).
- This can land before or after TKT-051. The card must not assume the winner line exists.

## Acceptance criteria

- [ ] Each evening is one card, and the heading is the name or the date.
- [ ] The gap is the prominent amount, with money in, money out, and the muted counts still visible.
- [ ] A named evening shows its date, and its location when one is set.
- [ ] A biggest-winner fact already on the entry is visible, and a card without that fact still renders.
- [ ] The card opens the summary, in RTL, at 360px width.
- [ ] The manual checklist describes this order.
