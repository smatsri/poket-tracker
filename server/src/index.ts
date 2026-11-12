import { createApp } from "./app.js";
import { port, sqlitePath } from "./config.js";

const app = createApp();

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`SQLite path ${sqlitePath}`);
});
