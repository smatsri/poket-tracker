---
name: batch-tickets
description: >-
  Implement the next ready tickets in this repo, one commit each.
  Use when the user asks to take the next ticket, work N tickets,
  continue a milestone, or repeat the ticket loop.
---

# Batch tickets

The ticket file is the spec. Work an agreed count, then stop.

You can ask the user any clarification question. Ask before guessing when the count, scope, a dependency, or a product decision is unclear, and pause that ticket until they answer.

## Agree the count first

Before editing, state the tickets you will attempt, in order.

- "Next 3" means three finished tickets.
- A milestone means the remaining tickets in that milestone, in ticket-number order.
- "Go" or "continue" with no count: ask how many. Do not start work.

Do not begin a ticket whose `Depends on` entries are not `done`. Stop and ask. Do not skip it for a later ticket unless the user says to.

## Each ticket

1. Read `tickets/README.md`, then that ticket and the docs it cites. Set `**Status:** in-progress` only if you have to stop before it is done.
2. Implement its scope. Leave `Out of scope` alone.
3. Run the tests and typecheck that prove its acceptance criteria.
4. When they pass, check every acceptance box and set `**Status:** done`.
5. Commit that ticket by itself. Use the repo's recent `feat:` style. The body must contain `Closes #<issue>` from `**Issue:**`, not the `TKT-` id.

```text
feat: calculate session results in a React-free domain layer

Closes #8
```

On PowerShell, pass that message with a here-string. Do not commit a failing ticket. Do not push unless the user asks. Pushing the commit to the default branch closes the GitHub issue.

## After each commit

Count it toward the agreement. Take the next ticket in the same way.

Stop when the count is finished, the next ticket is blocked, tests cannot be made to pass, or a ticket needs a decision. Report what landed, what is left, and the next ready ticket.
