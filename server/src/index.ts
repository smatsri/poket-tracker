import { createApp } from "./app.js";
import { databaseUrl, port } from "./config.js";
import { closeDatabase, openAppDatabase } from "./db/database.js";

async function main(): Promise<void> {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  await openAppDatabase(databaseUrl);

  const app = createApp();
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

function shutdown(): void {
  void closeDatabase().finally(() => {
    process.exit(0);
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
