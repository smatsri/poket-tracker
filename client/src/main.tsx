import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App.tsx";
import { apiBaseUrl } from "./env.ts";
import "./styles/global.css";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("Root element not found");
}

if (apiBaseUrl.length === 0) {
  throw new Error("VITE_API_BASE_URL is empty");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
