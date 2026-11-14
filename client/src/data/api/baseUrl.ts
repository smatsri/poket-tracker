export function resolveApiBaseUrl(value: string | undefined): string {
  if (value === undefined) {
    return "http://localhost:3001";
  }

  return value.replace(/\/$/, "");
}
