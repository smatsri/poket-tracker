import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { apiBaseUrl } from "./env";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("Root element not found");
}

if (apiBaseUrl.length === 0) {
  throw new Error("VITE_API_BASE_URL is empty");
}

createRoot(root).render(<StrictMode />);
