import { useEffect, useState } from "react";
import { onNavigate, useAppLocation } from "../../app/navigation.ts";
import type { ApiClient, SessionDocument } from "../../data/api/client.ts";
import { ResultText } from "./ResultText.tsx";
import {
  loadStatistics,
  parseStatsLocation,
  presentPlayerStatistics,
  presentStatistics,
  presentStatisticsFailure,
  statsCopy,
  type StatisticsFailureView,
  type StatisticsView,
} from "./statistics.ts";

type StatisticsScreenState =
  | { status: "loading" }
  | { status: "ready"; documents: SessionDocument[] }
  | StatisticsFailureView;

export function StatisticsScreen({ api }: { api: ApiClient }) {
  const { route } = useAppLocation();
  const location = parseStatsLocation(route.path);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<StatisticsScreenState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    loadStatistics(api)
      .then((documents) => {
        if (active) {
          setState({ status: "ready", documents });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState(presentStatisticsFailure(error));
        }
      });

    return () => {
      active = false;
    };
  }, [api, attempt]);

  if (state.status === "loading") {
    return <p className="muted">{statsCopy.loading}</p>;
  }

  if (state.status === "error") {
    return (
      <section className="stack">
        <h1>{statsCopy.title}</h1>
        <article className="card stack">
          <p className="notice notice-alert" role="alert">
            {state.message}
          </p>
          <button type="button" className="button button-secondary" onClick={() => setAttempt((current) => current + 1)}>
            {state.retryLabel}
          </button>
        </article>
      </section>
    );
  }

  const view = presentStatistics(state.documents);
  if (location.screen === "player" && location.playerId !== null) {
    return <PlayerHistory documents={state.documents} playerId={location.playerId} />;
  }

  return <StatisticsBody view={view} />;
}

function StatisticsBody({ view }: { view: StatisticsView }) {
  return (
    <section className="stack">
      <h1>{view.title}</h1>
      {view.status === "empty" ? (
        <article className="card">
          <p>{view.message}</p>
        </article>
      ) : (
        <>
          <article className="card totals">
            <p>
              <span className="muted">{statsCopy.sessions}</span>
              <strong>{view.sessionCount}</strong>
            </p>
            <p>
              <span className="muted">{statsCopy.transactions}</span>
              <strong>{view.transactionCount}</strong>
            </p>
          </article>
          <section className="stack">
            <h2>{statsCopy.players}</h2>
            <ul className="choice-list">
              {view.players.map((player) => (
                <li key={player.playerId}>
                  <a className="player-row" href={player.href} onClick={(event) => onNavigate(event, player.href)}>
                    <span className="player-name">{player.name}</span>
                    <ResultText result={player.result} prominent />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </section>
  );
}

function PlayerHistory({ documents, playerId }: { documents: SessionDocument[]; playerId: string }) {
  const player = presentPlayerStatistics(documents, playerId);
  if (player === null) {
    return (
      <section className="stack">
        <BackLink />
        <article className="card">
          <p>{statsCopy.missingPlayer}</p>
        </article>
      </section>
    );
  }

  return (
    <section className="stack evening">
      <BackLink />
      <header className="stack">
        <h1>{player.name}</h1>
      </header>
      <article className="card totals">
        <p>
          <span className="muted">מאזן</span>
          <ResultText result={player.overall} prominent />
        </p>
      </article>
      <ul className="choice-list">
        {player.evenings.map((evening) => (
          <li key={evening.sessionId}>
            <a className="player-row" href={evening.href} onClick={(event) => onNavigate(event, evening.href)}>
              <span className="player-name">{evening.date}</span>
              <ResultText result={evening.result} prominent />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BackLink() {
  return (
    <a href="/stats" onClick={(event) => onNavigate(event, "/stats")}>
      {statsCopy.back}
    </a>
  );
}
