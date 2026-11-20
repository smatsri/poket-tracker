import type { ApiClient } from "../data/api/client.ts";
import type { LocalRepository } from "../data/local/repository.ts";
import { CurrentEveningIcon, HistoryIcon, StatsIcon } from "./icons.tsx";
import { onNavigate, useAppLocation } from "./navigation.ts";
import { navigation, sectionTitle, type RouteId } from "./routes.ts";
import { CurrentEveningScreen } from "../features/sessions/CurrentEveningScreen.tsx";
import { HistoryScreen } from "../features/sessions/HistoryScreen.tsx";
import { StatisticsScreen } from "../features/sessions/StatisticsScreen.tsx";
import type { EveningService } from "../features/sessions/evening.ts";
import type { PlayerDirectory } from "../features/players/directory.ts";

const icons: Record<RouteId, () => React.JSX.Element> = {
  current: CurrentEveningIcon,
  history: HistoryIcon,
  stats: StatsIcon,
};

export function App({
  evening,
  players,
  api,
  repository,
}: {
  evening: EveningService;
  players: PlayerDirectory;
  api: ApiClient;
  repository: LocalRepository;
}) {
  const { route } = useAppLocation();

  return (
    <div className="shell">
      <header className="app-header">
        <p className="app-header-product">מעקב פוקר</p>
        <h1 className="app-header-title">{sectionTitle(route)}</h1>
      </header>
      <main className="shell-main">
        {route.id === "current" ? <CurrentEveningScreen evening={evening} players={players} /> : null}
        {route.id === "history" ? <HistoryScreen api={api} repository={repository} /> : null}
        {route.id === "stats" ? <StatisticsScreen api={api} /> : null}
        {route.id === "unknown" ? <Placeholder body="בחרו יעד מהניווט למטה." /> : null}
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

function Placeholder({ body }: { body: string }) {
  return (
    <section className="stack">
      <article className="card">
        <p className="muted">{body}</p>
      </article>
    </section>
  );
}
