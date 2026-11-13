import { useEffect, useState } from "react";
import { onNavigate, useAppLocation } from "../../app/navigation.ts";
import type { ApiClient } from "../../data/api/client.ts";
import { ResultText } from "./ResultText.tsx";
import {
  historyCopy,
  loadSessionHistory,
  parseHistoryLocation,
  presentHistoryFailure,
  presentSessionHistory,
  type HistoryFailureView,
  type HistoryListView,
} from "./sessionHistory.ts";

type HistoryScreenState =
  | { status: "loading" }
  | HistoryListView
  | HistoryFailureView;

export function HistoryScreen({ api }: { api: ApiClient }) {
  const { route } = useAppLocation();
  const location = parseHistoryLocation(route.path);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<HistoryScreenState>({ status: "loading" });

  useEffect(() => {
    if (location.screen !== "list") {
      return;
    }

    let active = true;
    setState({ status: "loading" });
    loadSessionHistory(api)
      .then((documents) => {
        if (active) {
          setState(presentSessionHistory(documents));
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState(presentHistoryFailure(error));
        }
      });

    return () => {
      active = false;
    };
  }, [api, attempt, location.screen]);

  if (location.screen === "summary") {
    return (
      <section className="stack">
        <a href="/history" onClick={(event) => onNavigate(event, "/history")}>
          חזרה להיסטוריה
        </a>
        <h1>{historyCopy.summaryTitle}</h1>
      </section>
    );
  }

  if (state.status === "loading") {
    return <p className="muted">{historyCopy.loading}</p>;
  }

  if (state.status === "error") {
    return (
      <section className="stack">
        <h1>{historyCopy.title}</h1>
        <article className="card stack">
          <p className="notice notice-alert" role="alert">
            {state.message}
          </p>
          {state.canRetry ? (
            <button type="button" className="button button-secondary" onClick={() => setAttempt((current) => current + 1)}>
              {state.retryLabel}
            </button>
          ) : null}
        </article>
      </section>
    );
  }

  return (
    <section className="stack">
      <h1>{state.title}</h1>
      {state.status === "empty" ? (
        <article className="card">
          <p>{state.message}</p>
        </article>
      ) : (
        <ul className="choice-list">
          {state.entries.map((entry) => (
            <li key={entry.id}>
              <a className="player-row" href={entry.href} onClick={(event) => onNavigate(event, entry.href)}>
                <span className="player-row-main">
                  <span className="player-name">{entry.date}</span>
                  <span className="muted">
                    {entry.playersLabel} · {entry.transactionsLabel}
                  </span>
                </span>
                <ResultText result={entry.result} prominent />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
