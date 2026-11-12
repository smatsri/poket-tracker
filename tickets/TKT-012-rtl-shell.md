# TKT-012 — Establish the Hebrew RTL application shell

**Status:** todo  
**Issue:** #12  
**Milestone:** M3 Live evening  
**Depends on:** [TKT-001](TKT-001-scaffold-workspaces.md) (#1)

## Goal

Create the shared visual foundation for a mobile Hebrew application.

## Scope

- Set the document language to Hebrew and the direction to RTL.
- Load Heebo through the `@fontsource/heebo` package and apply the color, radius, spacing, and type tokens from [specs/Visual Design Language.md](../specs/Visual%20Design%20Language.md).
- Add the three bottom-navigation destinations: `/` labeled `ערב נוכחי`, `/history` labeled `היסטוריה`, and `/stats` labeled `סיכומים`.
- Use visible Hebrew labels and direction-aware icons.
- Respect mobile safe areas and a minimum 44px touch target.
- Use CSS logical properties for alignment and spacing.
- Provide shared styles for cards, primary, secondary, and restrained destructive actions.

## Out of scope

- Session data, forms, and statistics content.
- A component library, dark theme, and desktop-first layout.

## Implementation notes

- Implement the three routes in the client without adding a routing package.
- Keep route content as placeholders until their feature tickets.
- Format nothing financial in this ticket; TKT-008 owns the formatter used by screens.

## Acceptance criteria

- [ ] The shell is Hebrew and RTL at a 360px viewport.
- [ ] All three navigation labels are visible and reach the correct route.
- [ ] The palette, light surfaces, rounded cards, and green primary action match the design language.
- [ ] Navigation remains usable with a mobile safe-area inset.
- [ ] No screen uses hardcoded left or right positioning for layout.
