import { apiBaseUrl } from "../../env.ts";
import { createApiClient, type ApiClient } from "./client.ts";

export function createBrowserApiClient(): ApiClient {
  return createApiClient(apiBaseUrl);
}
