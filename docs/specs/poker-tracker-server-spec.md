# Poker Tracker --- Server Specification

## 1. Project Overview

A small personal poker session tracking application.

The initial version has a single user (the application owner), who
records poker transactions during weekly poker games.

The client application records transactions locally during a session and
sends the complete session to the server when the session is finished.

The server is responsible for persistent storage, data retrieval, and
data integrity.

The client is responsible for the user experience, local storage,
calculations, statistics, and presentation.

## 2. Technology Stack

-   **Runtime:** Node.js
-   **Language:** TypeScript
-   **HTTP Framework:** Express
-   **Database:** SQLite
-   **Database Access:** better-sqlite3
-   **Validation:** Zod

Use a lightweight implementation. Avoid unnecessary abstractions and
dependencies.

## 3. Architecture

Separate the server into three main layers:

### Routes

Responsible for: - Receiving HTTP requests. - Validating request
parameters and payloads. - Calling the appropriate service. - Returning
HTTP responses.

### Services

Responsible for: - Application-level operations. - Session creation and
retrieval. - Player management. - Database transaction coordination.

### Database

Responsible for: - Database initialization. - Schema definition. - SQL
queries. - Database connection management.

Routes should not contain SQL queries or business logic.

## 4. Data Model

The initial database contains three tables.

### Players

Represents registered poker players.

  Field        Type   Description
  ------------ ------ --------------------
  id           TEXT   Primary key
  name         TEXT   Player name
  created_at   TEXT   Creation timestamp

Requirements: - Players are created independently of poker sessions. - A
player can participate in multiple sessions. - Player names should not
be used as identifiers. - Initially, there is no user authentication or
multi-user management.

### Sessions

Represents a poker evening.

  Field        Type   Description
  ------------ ------ --------------------
  id           TEXT   Primary key
  date         TEXT   Session date
  created_at   TEXT   Creation timestamp

A session contains multiple transactions.

The participant list is derived from the players associated with its
transactions. No separate participant table is required in the initial
version.

### Transactions

Represents a financial movement associated with a player and a session.

  Field        Type      Description
  ------------ --------- --------------------------------
  id           TEXT      Primary key
  session_id   TEXT      Foreign key to Sessions
  player_id    TEXT      Foreign key to Players
  type         TEXT      Transaction type
  amount       INTEGER   Amount in whole currency units
  timestamp    TEXT      Transaction timestamp

Supported transaction types:

-   `buy-in`
-   `rebuy`
-   `cash-out`

Amounts are stored as positive integers. Transaction type determines
their meaning.

All transactions belong to exactly one session and one player.

## 5. API Specification

Base path: `/api`

### Players

#### GET /api/players

Returns all registered players.

Response:

``` json
{
  "players": [
    {
      "id": "player-001",
      "name": "David"
    }
  ]
}
```

#### POST /api/players

Creates a new player.

Request:

``` json
{
  "name": "David"
}
```

Returns the created player.

Validate that the name is not empty.

### Sessions

#### POST /api/sessions

Creates a complete session, including all its transactions.

Request:

``` json
{
  "id": "session-001",
  "date": "2026-11-12",
  "transactions": [
    {
      "id": "tx-001",
      "playerId": "player-001",
      "type": "buy-in",
      "amount": 50,
      "timestamp": "2026-11-12T20:15:00"
    },
    {
      "id": "tx-002",
      "playerId": "player-001",
      "type": "rebuy",
      "amount": 50,
      "timestamp": "2026-11-12T21:10:00"
    },
    {
      "id": "tx-003",
      "playerId": "player-001",
      "type": "cash-out",
      "amount": 120,
      "timestamp": "2026-11-12T23:00:00"
    }
  ]
}
```

Requirements: - The server creates the session and its transactions in a
single database transaction. - If any operation fails, nothing should be
persisted. - All referenced players must exist. - Transaction IDs must
be unique. - The server must reject duplicate session IDs. - The
operation must be safe against accidental duplicate submissions. Use the
session ID as an idempotency key: a repeated identical submission should
not create duplicate records; conflicting content should return a
conflict response. - Return the complete saved session.

#### GET /api/sessions/:id

Returns a complete session.

Response:

``` json
{
  "id": "session-001",
  "date": "2026-11-12",
  "transactions": [
    {
      "id": "tx-001",
      "playerId": "player-001",
      "type": "buy-in",
      "amount": 50,
      "timestamp": "2026-11-12T20:15:00"
    }
  ],
  "players": [
    {
      "id": "player-001",
      "name": "David"
    }
  ]
}
```

The players array contains the distinct players referenced by the
session's transactions.

Return 404 if the session does not exist.

#### GET /api/sessions?from=YYYY-MM-DD&to=YYYY-MM-DD

Returns sessions within an optional date range.

Requirements: - Both date parameters are optional. - Results should be
ordered by date, newest first. - Each session should include its
transactions and associated players. - If no date range is supplied,
return all sessions. - Do not introduce pagination in the initial
version.

Example response:

``` json
{
  "sessions": [
    {
      "id": "session-001",
      "date": "2026-11-12",
      "transactions": [],
      "players": []
    }
  ]
}
```

## 6. Data Integrity

The server must enforce:

-   Foreign key constraints.
-   Valid transaction types.
-   Positive transaction amounts.
-   Valid session and transaction identifiers.
-   Valid dates and timestamps.
-   Atomic session creation.

Use SQLite foreign key enforcement.

Do not calculate profits, losses, balances, or statistics on the server.
These are client responsibilities.

## 7. Error Handling

Use consistent JSON error responses.

Example:

``` json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid session data"
  }
}
```

Expected HTTP status codes:

-   200 --- Successful retrieval.
-   201 --- Resource created.
-   400 --- Invalid request.
-   404 --- Resource not found.
-   409 --- Duplicate or conflicting resource.
-   500 --- Unexpected server error.

Do not expose internal database errors or stack traces to clients.

## 8. Project Structure

Suggested initial structure:

``` text
server/
├── src/
│   ├── server.ts
│   ├── app.ts
│   ├── routes/
│   │   ├── players.ts
│   │   └── sessions.ts
│   ├── services/
│   │   ├── playerService.ts
│   │   └── sessionService.ts
│   ├── db/
│   │   ├── database.ts
│   │   └── schema.sql
│   └── types/
│       └── index.ts
├── data/
├── package.json
└── tsconfig.json
```

Keep the implementation straightforward. Do not introduce a repository
abstraction or dependency injection framework unless there is a concrete
need.

## 9. Out of Scope

Do not implement these features in the initial version:

-   User authentication.
-   Multiple application users.
-   Player accounts or profiles.
-   Separate participant management.
-   Editing or deleting existing sessions.
-   Advanced poker statistics.
-   Financial calculations.
-   Real-time synchronization.
-   Pagination.
-   Cloud infrastructure.

## 10. Development Guidelines

1.  Inspect the existing project before creating files.
2.  Keep the implementation aligned with this specification.
3.  Implement database schema and initialization first.
4.  Implement player endpoints.
5.  Implement session creation and retrieval.
6.  Add request validation and error handling.
7.  Add tests for database integrity and atomic session creation.
8.  Verify all endpoints before considering the server complete.

Build a small, maintainable server. Avoid overengineering.

The primary goal is a reliable API for storing and retrieving complete
poker sessions.
