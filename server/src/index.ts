import type { Server } from "node:http";
import { createApp } from "./app.js";
import { databaseUrl, httpHost, port } from "./config.js";
import { closeDatabase, openAppDatabase } from "./db/database.js";
import { assertProductionPassword } from "./http/auth.js";
import { openHttpServer, stopServer } from "./http/server.js";

let server: Server | undefined;
let stopping = false;

async function main(): Promise<void> {
  assertProductionPassword();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  await openAppDatabase(databaseUrl);

  server = openHttpServer(createApp(), port);
  server.once("listening", () => {
    console.log(`Server listening on ${httpHost}:${port}`);
  });
}

function shutdown(): void {
  if (stopping) {
    return;
  }
  stopping = true;

  const current = server;
  const done = current === undefined ? closeDatabase() : stopServer(current, closeDatabase);
  void done.finally(() => {
    process.exit(0);
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
