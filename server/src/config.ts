export const port = Number(process.env.PORT ?? "3001");

export const sqlitePath = process.env.SQLITE_PATH ?? "data/poker.sqlite";

export const clientOrigin =
  process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
