# M9 — Evening usability

**Status:** Accepted, not built  
**Tickets:** TKT-041–TKT-048

M0–M8 are done. M9 comes from using the app during a real evening. It makes that evening faster to run and the recap easier to check. It does not redesign the interface.

[docs/architecture.md](architecture.md), [docs/data-model.md](data-model.md), and [docs/api/openapi.yaml](api/openapi.yaml) stay the contract of what is built today. The ticket that changes a contract updates those docs in the same change.

## Decisions

1. A player row shows the name stored on the player. After refresh, navigation, and a failed reload that still has a cached list, a known name stays visible. When no name can be resolved, the row shows `שחקן לא ידוע` instead of the player id.
2. A confirmed submit (`201`, or an identical `200`) opens that evening's summary and leaves the current-evening screen empty, so the next evening can be started immediately. A pending submit, a network or `500` failure, and a `409` stay on the current evening with the existing recovery behavior. This replaces the TKT-018 outcome that kept the submitted evening on the current-evening screen.
3. On the empty current-evening screen, `התחלת ערב חדש` is the first action. It stays above the player directory and is visible on a 360px-wide phone without scrolling past that directory. Creating a player before the evening starts remains available.
4. The create sheet offers `הוספת כסף` and `יציאה`. The first `הוספת כסף` for a player in that evening is stored as `buy-in`. A later one is stored as `rebuy`. Cash-out stays `cash-out`. The edit sheet still shows the stored type, so a correction can change it. Stored totals are unchanged: buy-in and rebuy sum as money in.
5. The amount field starts at the operator's default, including after a successful single save. The initial default is 50. The operator can change the default, and can change the amount for one action. The default and a currency label live in local settings. The initial label is `₪`. Amounts stay positive integers. The label is display-only and is not stored on transactions or sessions.
6. Each player in the create sheet shows that player's net for the current evening, from the existing session calculation. A player with no transactions shows zero.
7. `הוספת כסף` can apply one amount to several players and write one transaction per player in a single local save. The type rule in decision 4 applies to each player. Cash-out stays one player. If the save fails, the evening is unchanged.
8. An evening may have an optional name and an optional location, each at most 80 characters after the same trim used for player names. An empty value is omitted. Both are chosen during the draft and stored with the submit. A closed evening's name, location, date, and transactions stay read-only. History and the summary show the name, or the date when the name is absent, and the location when it is present. Existing rows stay unnamed and unlocated.
9. A history card leads with money in, money out, and the gap between them. The gap is the existing session balance, including its sign and color. Counts of money-in transactions (buy-in plus rebuy) and cash-out transactions are secondary. Those counts are not expected to match. The results-by-session chart still plots session balance.
10. A player can be renamed. The name validation matches create. Transactions keep the player id, so history follows the new name. A player can be deleted only when no transaction references them. Otherwise the server returns `409` and the player remains. There is no merge.
11. Closed sessions may be cached in IndexedDB so history and the summary can render before the network returns. A successful server response replaces the cache. The server remains the source of truth. This cache is built after name and location exist. The active draft stays in its current store.

## Ticket map

| Decision | Ticket |
| --- | --- |
| 1 | TKT-041 |
| 2, 3 | TKT-042 |
| 4, 5, 6 | TKT-043 |
| 7 | TKT-044 |
| 8 | TKT-045 |
| 9 | TKT-046 |
| 10 | TKT-047 |
| 11 | TKT-048 |

## Out of scope

- A visual redesign.
- Notes, photos, video, and the poker-night journal.
- Hand histories and strategy tools.
- Editing or deleting a closed evening.
- Merging `buy-in` and `rebuy` into one stored type.
- A currency code on each amount, or converting between currencies.
- Hardcoding 50 as a domain constant.
- Deleting a player who has transactions.
- Full offline history, multi-device sync, and player accounts.
