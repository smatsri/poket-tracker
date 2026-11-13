import { useEffect, useState } from "react";
import { matchRoute, type AppRoute } from "./routes.ts";

export function useAppLocation(): { route: AppRoute; search: URLSearchParams } {
  const [href, setHref] = useState(() => currentHref());

  useEffect(() => {
    const sync = () => setHref(currentHref());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const url = new URL(href, "http://localhost");
  return { route: matchRoute(url.pathname), search: url.searchParams };
}

export function navigate(path: string): void {
  const next = new URL(path, window.location.origin);
  const target = `${next.pathname}${next.search}`;
  if (target === currentHref()) {
    return;
  }

  window.history.pushState(null, "", target);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function onNavigate(event: React.MouseEvent<HTMLAnchorElement>, path: string): void {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  event.preventDefault();
  navigate(path);
}

function currentHref(): string {
  return `${window.location.pathname}${window.location.search}`;
}
