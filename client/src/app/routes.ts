export const navigation = [
  { path: "/", id: "current", label: "ערב נוכחי" },
  { path: "/history", id: "history", label: "היסטוריה" },
  { path: "/stats", id: "stats", label: "סיכומים" },
] as const;

export type RouteId = (typeof navigation)[number]["id"];

export interface AppRoute {
  id: RouteId | "unknown";
  path: string;
  label: string;
}

export function matchRoute(pathname: string): AppRoute {
  const path = normalizePath(pathname);
  const match = navigation.find((item) => item.path === path);
  if (match !== undefined) {
    return match;
  }

  return { id: "unknown", path, label: "העמוד לא נמצא" };
}

function normalizePath(pathname: string): string {
  if (pathname.length === 0) {
    return "/";
  }

  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}
