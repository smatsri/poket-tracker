# M10 — Follow-ups

**Status:** Done  
**Tickets:** TKT-049–TKT-055

M0–M9 are done. M10 comes from using the app. The tickets are independent. Take them in any order.

[docs/architecture.md](architecture.md), [docs/data-model.md](data-model.md), and [docs/api/openapi.yaml](api/openapi.yaml) stay the contract of what is built today. The ticket that changes a contract updates those docs in the same change.

## Decisions

1. After a successful save for one player, the add sheet stays open, the amount returns to the operator's default, and the amount field is not focused. The number keyboard opens only when the operator taps the amount. A successful save for several players still closes the sheet. A failed save leaves the evening unchanged.
2. The summary lists players by net result, highest first. A tie breaks by Hebrew name, then by player id, using the same comparison as the overall ranking. The current-evening list keeps its current order.
3. A history card names the player with the highest net in that evening and shows that signed result. The tie-break matches decision 2. The line is omitted when the evening has no player results. An unknown player is `שחקן לא ידוע`. The value is calculated on the client and is not stored. A negative or zero top result is still shown.
4. History is one card per evening, using the existing surface, radius, and type scale. The heading is the evening name, or the date when the name is absent. The date and the location are secondary when a name is present. The biggest-winner line sits with the heading when that fact exists. The gap is the prominent amount. Money in and money out follow it. Counts stay muted. The whole card opens the summary. Facts already on the card stay. No new palette.
5. A top bar shows `מעקב פוקר` and the section title: `ערב נוכחי`, `היסטוריה`, or `סטטיסטיקה`. A page heading that repeats that title is not shown again. A nested subject keeps its own heading in the page, including `סיכום`, `כל הפעולות`, and a player name. The bar stays visible, respects the top safe area, and uses the existing tokens. Bottom navigation stays.
6. An evening may have one optional note, at most 500 characters after the same trim and internal-whitespace collapse used for a session name. An empty value is omitted. The note is edited on the draft and stored with the submit. The summary shows it. A closed evening's note is read-only. History does not have to show it. Sessions stored before the field existed stay valid without a note.
7. A closed evening can be archived or deleted. Archive sets a server `archivedAt` and hides the evening from the default history list and from statistics. `GET /api/sessions?archived=true` returns only archived evenings. `GET` of one session still returns an archived evening. Restore clears `archivedAt`. Archive and restore are idempotent. Delete removes the session and its transactions, returns `204`, and a second delete returns `404`. A later submit of that same id is a new session. Name, location, date, note, and transactions stay uneditable. Archive, restore, and delete are the only mutations of a closed evening. Submitting an identical body does not change `archivedAt`. The default history cache is replaced only by a non-archived history response. The archived list does not replace that cache.

## Ticket map

| Decision | Ticket |
| --- | --- |
| 1 | TKT-049 |
| 2 | TKT-050 |
| 3 | TKT-051 |
| 4 | TKT-052 |
| 5 | TKT-053 |
| 6 | TKT-054 |
| 7 | TKT-055 |

## Out of scope

- A separate development database. Local development already uses Docker Postgres, and production uses Neon.
- Several notes, photos, or editing a note after the evening is closed.
- Editing a closed evening's name, location, date, or transactions.
- Changing the current-evening player order.
- A new color palette or a second visual language.
