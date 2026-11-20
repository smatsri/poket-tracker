# TKT-053 — Restyle the header and screen title

**Status:** done  
**Issue:** #55  
**Milestone:** M10 Follow-ups  
**Depends on:** None

## Goal

Give every screen one title, in a header that stays put.

## Scope

- Add a top bar with the product name `מעקב פוקר` and the section title for the active route: `ערב נוכחי`, `היסטוריה`, or `סטטיסטיקה`.
- Remove a page `h1` that repeats that section title.
- Keep a nested subject heading in the page. That includes `סיכום`, `כל הפעולות`, and a player name.
- Keep the bar visible while the page scrolls, and pad it for the top safe area.
- Use the existing color, type, and spacing tokens. Keep Hebrew RTL.
- Leave the bottom navigation where it is, including its labels and safe area.
- Confirm the title is visible at 360px width on the current evening, history, a summary, and statistics.

## Out of scope

- Redesigning the history cards. That is TKT-052.
- A new wordmark, palette, or navigation destination.
- Changing the document title in `index.html` away from `מעקב פוקר`.

## Implementation notes

- Product decision 5 in [docs/roadmap-m10.md](../docs/roadmap-m10.md).
- The section title comes from the route. The summary and a player page stay under היסטוריה, so their subject headings stay in the page.

## Acceptance criteria

- [x] The top bar shows `מעקב פוקר` and the section title, and it stays visible while the page scrolls.
- [x] The current evening, the history list, and statistics do not repeat that title in a second heading.
- [x] A summary, the full transaction list, and a player page keep their own subject heading.
- [x] The bar respects the top safe area, and the bottom navigation is unchanged.
- [x] The title fits at 360px width in RTL, using the existing tokens.
