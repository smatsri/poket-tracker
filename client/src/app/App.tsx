import { CurrentEveningIcon, HistoryIcon, StatsIcon } from "./icons.tsx";
import { onNavigate, useAppLocation } from "./navigation.ts";
import { navigation, type RouteId } from "./routes.ts";
import { CurrentEveningScreen } from "../features/sessions/CurrentEveningScreen.tsx";
import type { EveningService } from "../features/sessions/evening.ts";
import type { PlayerDirectory } from "../features/players/directory.ts";

const icons: Record<RouteId, () => React.JSX.Element> = {
  current: CurrentEveningIcon,
  history: HistoryIcon,
  stats: StatsIcon,
};

export function App({ evening, players }: { evening: EveningService; players: PlayerDirectory }) {
  const { route } = useAppLocation();

  return (
    <div className="shell">
      <main className="shell-main">
        {route.id === "current" ? <CurrentEveningScreen evening={evening} players={players} /> : null}
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
