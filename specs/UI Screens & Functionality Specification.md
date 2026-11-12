# Poker Tracker — UI Screens & Functionality Specification

**Status:** Initial Specification  
**Platform:** Mobile-first Web Application  
**Language:** Hebrew  
**Direction:** RTL  
**User Model:** Single application user, multiple poker players.

## 1. Product Overview

Poker Tracker is a personal application for recording and reviewing poker evenings.

The application is operated by one person, who records financial transactions for all players participating in a poker evening.

The main usage scenario is during a live poker game.

The application must make it easy to:

- Record transactions quickly.
- See the current balance of every player.
- Review recent activity.
- Review previous poker evenings.
- Analyze results over time.

The interface must be optimized for mobile usage.

## 2. Main Navigation

The application has three primary navigation areas:

1. **ערב נוכחי** — Current session.
2. **היסטוריה** — Previous sessions.
3. **סיכומים** — Statistics and aggregate results.

Use a persistent bottom navigation bar.

Player management should be accessible from the relevant screens and does not require a dedicated primary navigation item.

## 3. Screen: Current Evening

**Purpose:** Main operational screen during a poker evening.

This is the most important screen in the application.

### Header

- Session title: ערב נוכחי.
- Session date.
- Session status.

### Session Overview

Show a compact summary:

- סך כניסות — Total buy-ins and rebuys.
- סך יציאות — Total cash-outs.
- מאזן — Difference between cash-outs and buy-ins.

### Players List

Display all players who have recorded transactions in the current session.

Each player row should show:

- Player name.
- Total buy-ins.
- Total cash-outs.
- Current net result.

The net result should be visually prominent.

Positive results should be green.
Negative results should be red.

### Recent Activity

Show the most recent transactions.

Each transaction should include:

- Player name.
- Transaction type.
- Amount.
- Time.

Provide access to the complete transaction history.

### Primary Action

A prominent button:

**+ הוספת פעולה**

This should be the easiest action to find on the screen.

### Behavior

- Update all balances immediately after a transaction is recorded.
- Update recent activity immediately.
- Allow editing and deleting transactions before session submission.
- Allow opening player details.
- Keep the session locally saved at all times.

### Empty State

When there is no active session:

Display a simple message and a primary action:

**התחלת ערב חדש**

## 4. Flow: Add Transaction

**Purpose:** Record a transaction as quickly as possible.

This is the most important interaction in the application.

### Required Fields

1. Player selection.
2. Transaction type.
3. Amount.

### Transaction Types

| Internal Value | Hebrew Label |
| -------------- | ------------ |
| buy-in         | כניסה        |
| rebuy          | כניסה נוספת  |
| cash-out       | יציאה        |

### Interaction

The user should be able to:

1. Select a player.
2. Select a transaction type.
3. Enter an amount.
4. Save the transaction.

The timestamp should be generated automatically.

### Requirements

- The amount field should be prominent.
- Use a numeric keyboard.
- Player selection should be quick.
- Transaction types should be represented by clear, easy-to-tap controls.
- Saving should require as few interactions as possible.
- Support adding another transaction immediately after saving.
- If opened from a player row, preselect that player.

### Validation

- A player must be selected.
- A transaction type must be selected.
- Amount must be a positive integer.

### Persistence

Save the transaction locally before considering the operation complete.

Update the current session immediately.

The user should not need to confirm every transaction.

Provide a way to undo, edit, or delete accidental entries.

The exact presentation (modal, bottom sheet, or dedicated screen) can be decided during implementation.

## 5. Screen: Transaction History

**Purpose:** Review all transactions in a session.

### Content

- Session date.
- Complete chronological transaction list.
- Player name.
- Transaction type.
- Amount.
- Time.

Default ordering: newest first.

### Functionality

- Open transaction details.
- Edit transaction.
- Delete transaction.
- Filter by player or transaction type if useful.

Editing or deleting a transaction must update all derived balances.

## 6. Screen: Session History

**Purpose:** Browse previous poker evenings.

Each session entry should show:

- Date.
- Number of players.
- Number of transactions.
- Overall result.

Sessions should be sorted newest first.

Tapping a session opens its details.

Provide an empty state when no previous sessions exist.

## 7. Screen: Session Summary

**Purpose:** Review the outcome of a completed poker evening.

### Content

- Session date.
- Total buy-ins and rebuys.
- Total cash-outs.
- Overall difference.
- Player results.
- Number of players.
- Number of transactions.

### Player Results

Display a list of players and their results.

Make positive and negative results easy to distinguish.

### Functionality

- Open full transaction history.
- View individual player details.
- All financial calculations are performed by the client.

A submitted session should be read-only in the first version.

## 8. Screen: Statistics

**Purpose:** Review results across multiple poker evenings.

Initial functionality:

- Total number of sessions.
- Total number of transactions.
- Overall results per player.
- Ranking of players by net result.
- Individual player history.

Charts can be introduced later if they provide meaningful information.

Avoid unnecessary analytics in the first version.

## 9. Player Management

The application maintains a list of players.

Required functionality:

- Load existing players.
- Create a new player.
- Select an existing player when recording a transaction.

Warn about possible duplicate player names.

No player accounts, authentication, permissions, or social features are required.

## 10. Session Lifecycle

### Starting a Session

- Create a new session.
- Generate a stable session ID.
- Set the session date.
- Save the session locally.

### During the Evening

- Add transactions.
- Edit or delete transactions.
- Recalculate balances.
- Persist changes locally.

### Finishing the Evening

- Allow the user to review the session.
- Submit the complete session to the server.
- Show submission status.

### Submission States

- Draft — session is being recorded.
- Pending — submission has not yet been confirmed.
- Submitted — server confirmed successful persistence.

If submission fails:

- Keep all local data.
- Allow retry.
- Reuse the same session ID.
- Never silently discard transactions.

Do not allow accidental creation of a new session while an earlier session is still pending submission.

## 11. Financial Calculations

For each player:

**Total Buy-ins**
= Buy-in + Rebuy amounts.

**Total Cash-outs**
= Cash-out amounts.

**Net Result**
= Total Cash-outs − Total Buy-ins.

At the session level, display the difference between all cash-outs and all buy-ins.

In a fully recorded game, these amounts should generally balance, subject to the actual money flow and any amounts not recorded in the application.

Do not silently adjust or force balances to reconcile.

## 12. Hebrew Terminology

Use consistent Hebrew terminology throughout the application.

| Concept         | Hebrew      |
| --------------- | ----------- |
| Session         | ערב         |
| Current Session | ערב נוכחי   |
| Player          | שחקן        |
| Transaction     | פעולה       |
| Buy-in          | כניסה       |
| Rebuy           | כניסה נוספת |
| Cash-out        | יציאה       |
| Balance         | מאזן        |
| History         | היסטוריה    |
| Summary         | סיכום       |
| Statistics      | סטטיסטיקות  |

## 13. First Version Priorities

### Must Have

- Start a new session.
- Load and create players.
- Record buy-ins, rebuys, and cash-outs.
- Edit and delete transactions.
- Display live player balances.
- Display recent activity.
- Persist the session locally.
- Submit completed sessions.
- Retry failed submissions safely.
- Browse previous sessions.
- View session summaries.

### Later Enhancements

- Advanced statistics.
- Player performance charts.
- Filters and search.
- Editing completed sessions.
- More detailed player profiles.

## 14. Non-Goals

The first version does not include:

- Multiple application users.
- Player login.
- Multi-device collaboration.
- Real-time synchronization.
- Poker hand tracking.
- Poker strategy tools.
- Chat or messaging.
- AI functionality.

## 15. Acceptance Criteria

The first version is considered usable when:

1. A new poker evening can be started from a phone.
2. A transaction can be recorded in a few taps.
3. Transactions survive refresh and browser restart.
4. Player balances update immediately.
5. Transactions can be corrected before submission.
6. A completed session can be submitted to the server.
7. Failed submissions can be retried without data loss or duplication.
8. Previous sessions can be opened and reviewed.
9. The entire application works naturally in Hebrew and RTL.
10. The main transaction flow is comfortable to use during a live poker evening.
