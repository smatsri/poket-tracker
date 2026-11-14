import { resolveApiBaseUrl } from "./data/api/baseUrl.ts";

export const apiBaseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
