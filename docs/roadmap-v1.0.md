# Poker Tracker – Product Roadmap 1.0

**Status:** Done  
**Version:** 1.0  
**Previous milestone:** MVP (M0–M5), complete  
**Shipped in:** M6 Version 1.0: Historical Insights (`TKT-023`–`TKT-028`)

## 1. Product direction

Poker Tracker is a tool for managing and understanding the ongoing activity of one regular poker group.

The application records poker evenings, reviews completed sessions, and calculates player statistics.

Version 1.0 builds on that foundation and makes the group's history more useful and understandable over time. That work is shipped. Acceptance evidence is in [TKT-028](../tickets/TKT-028-v1-acceptance.md).

The goal is not to build a professional poker analytics platform. It is to provide a clear picture of the group's activity and financial results.

## 2. Scope and assumptions

Version 1.0 continues with the existing product model:

- One application operator.
- One regular poker group.
- Multiple players participating in poker evenings.
- Mobile-first web application.
- Hebrew and RTL remain the primary interface.
- No player accounts or multi-user collaboration.
- No support for managing multiple independent groups.

These constraints keep the product focused and avoid introducing unnecessary complexity.

## 3. Version 1.0 objective

**Turn the existing session history into a useful longitudinal view of the poker group.**

The shipped work covers three areas.

### 3.1 Group overview

The statistics screen (`/stats`, סיכומים) shows:

- Total number of completed evenings.
- Total number of transactions.
- Player ranking by cumulative net result, including evenings played.
- Results by session, as a chart of each evening's session balance.
- Player comparison, as a chart of cumulative results.

Players with no transactions stay out of the ranking and the comparison chart.

### 3.2 Player history

A player's page (`/stats/:playerId`) shows:

- Cumulative profit/loss, equal to that player's overall result.
- Number of evenings played.
- Results for individual evenings.
- Historical progression of the player's cumulative result, oldest evening first.

### 3.3 Data visualization

Three charts are included:

1. **Cumulative result over time** – how a player's overall result changes from evening to evening.
2. **Results by session** – the group's session balance for each evening.
3. **Player comparison** – cumulative results across the group.

Charts support the existing statistics and history. They do not replace them. The results-by-session chart is the group's session balance (cash-outs minus buy-ins), not each player's result inside that evening.

The first implementation should prioritize clarity and mobile usability over visual complexity.

## 4. Out of scope

The following features are intentionally excluded from Version 1.0:

- Multiple poker groups.
- User accounts and authentication.
- Multi-device collaboration and real-time synchronization.
- Debt management and payments between players.
- Scheduling and attendance management for future evenings.
- Hand tracking and poker strategy analysis.
- AI features.
- Advanced analytics beyond the initial historical views.

These may be considered in later versions if actual usage justifies them.

## 5. Product and technical principles

- Reuse the existing architecture and domain calculations.
- Keep financial calculations on the client unless a concrete requirement justifies changing this.
- Treat stored sessions and transactions as the source data; calculate statistics from them.
- Avoid storing derived totals as independent authoritative data.
- Do not add API endpoints unless the existing API cannot reasonably support the feature.
- Keep the interface mobile-first and consistent with the existing visual design language.
- Add tests for all new calculations and historical views.
- Preserve the existing session recording and submission flows.

## 6. Definition of done

Version 1.0 is complete. [TKT-028](../tickets/TKT-028-v1-acceptance.md) recorded that:

- The existing MVP functionality continues to work.
- The group overview provides a useful picture of results over time.
- A player can review their historical results across sessions.
- The initial charts are available and readable on mobile.
- All displayed figures agree with the underlying session transactions.
- Automated tests cover new calculations and relevant edge cases.
- The application passes the relevant mobile and RTL acceptance checks.

## 7. Development approach

Version 1.0 was developed incrementally, in this order:

1. Review the existing statistics and history implementation.
2. Define the exact information and interactions required for the group overview.
3. Define the player history experience.
4. Identify the required chart types and their data.
5. Verify whether the existing API and data model are sufficient.
6. Implement the new views and charts.
7. Test calculations, historical consistency, and mobile usability.

No analytics endpoints were added. The views calculate from sessions returned by `GET /api/sessions`. Later work should reuse that path before changing the architecture.

## 8. Future direction

Version 1.0 is a continuation of the current product, not a major architectural expansion.

Future versions may explore:

- Managing future poker evenings.
- Debt and payment tracking.
- Richer player profiles.
- Group management and multiple groups.
- Multi-user access.
- Additional statistics and insights.

These ideas should remain outside the current implementation scope until Version 1.0 has been used and evaluated.
