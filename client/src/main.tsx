import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App.tsx";
import { createBrowserApiClient } from "./data/api/browserClient.ts";
import { createIndexedDbRepository } from "./data/local/indexedDb.ts";
import { createPlayerDirectory } from "./features/players/directory.ts";
import { createEveningService } from "./features/sessions/evening.ts";
import { apiBaseUrl } from "./env.ts";
import "./styles/global.css";

const repository = createIndexedDbRepository();
const api = createBrowserApiClient();
const players = createPlayerDirectory(repository, api);
const evening = createEveningService(repository, api);

const root = document.getElementById("root");
if (root === null) {
  throw new Error("Root element not found");
}

if (apiBaseUrl.length === 0) {
  throw new Error("VITE_API_BASE_URL is empty");
}

createRoot(root).render(
  <StrictMode>
    <App evening={evening} players={players} api={api} />
  </StrictMode>,
);
