import { useEffect, useState } from "react";
import { CurrentEveningIcon, HistoryIcon, StatsIcon } from "./icons.tsx";
import { matchRoute, navigation, type RouteId } from "./routes.ts";

const icons: Record<RouteId, () => React.JSX.Element> = {
  current: CurrentEveningIcon,
  history: HistoryIcon,
  stats: StatsIcon,
};

export function App() {
  const route = useRoute();

  return (
    <div className="shell">
      <main className="shell-main">
        {route.id === "current" ? <CurrentPlaceholder /> : null}
        {route.id === "history" ? <Placeholder title="היסטוריה" body="ערבים שהסתיימו יופיעו כאן." /> : null}
        {route.id === "stats" ? <Placeholder title="סיכומים" body="הסיכומים יופיעו כאן." /> : null}
        {route.id === "unknown" ? <Placeholder title="העמוד לא נמצא" body="בחרו יעד מהניווט למטה." /> : null}
      </main>
      <nav className="bottom-nav" aria-label="ניווט ראשי">
        {navigation.map((item) => {
          const Icon = icons[item.id];
          return (
            <a
              key={item.id}
              href={item.path}
              aria-current={route.id === item.id ? "page" : undefined}
              onClick={(event) => onNavigate(event, item.path)}
            >
              <Icon />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}

function CurrentPlaceholder() {
  return (
    <section className="stack">
      <header className="stack">
        <h1>ערב נוכחי</h1>
        <p className="muted">מסך הערב ייבנה בהמשך.</p>
      </header>
      <article className="card stack">
        <h2>פעולות</h2>
        <div className="action-row">
          <button type="button" className="button button-primary">
            פעולה ראשית
          </button>
          <button type="button" className="button button-secondary">
            פעולה משנית
          </button>
          <button type="button" className="button button-destructive">
            מחיקה
          </button>
        </div>
      </article>
    </section>
  );
}

function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <section className="stack">
      <h1>{title}</h1>
      <article className="card">
        <p className="muted">{body}</p>
      </article>
    </section>
  );
}

function useRoute() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const sync = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  return matchRoute(pathname);
}

function onNavigate(event: React.MouseEvent<HTMLAnchorElement>, path: string) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  event.preventDefault();
  if (window.location.pathname !== path) {
    window.history.pushState(null, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}
