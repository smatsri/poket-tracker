import { createApp } from "./app.js";
import { port, sqlitePath } from "./config.js";
import { closeDatabase, openAppDatabase } from "./db/database.js";

openAppDatabase(sqlitePath);

const app = createApp();

function shutdown(): void {
  closeDatabase();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`SQLite path ${sqlitePath}`);
});
