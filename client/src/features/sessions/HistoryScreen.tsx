import { useEffect, useState } from "react";
import { onNavigate, useAppLocation } from "../../app/navigation.ts";
import type { ApiClient, SessionDocument } from "../../data/api/client.ts";
import { ResultText } from "./ResultText.tsx";
import {
  historyCopy,
  loadSessionHistory,
  parseHistoryLocation,
  presentHistoryFailure,
  presentSessionHistory,
  type HistoryFailureView,
  type HistoryListView,
  type HistoryLocation,
} from "./sessionHistory.ts";
import {
  loadSessionSummary,
  presentSessionPlayer,
  presentSessionSummary,
  presentSummaryFailure,
  summaryCopy,
  type SessionSummaryView,
  type SummaryFailureView,
} from "./sessionSummary.ts";
import type { PresentedTransaction } from "./transactionHistory.ts";

type HistoryScreenState = { status: "loading" } | HistoryListView | HistoryFailureView;
type SummaryScreenState = { status: "loading" } | { status: "ready"; document: SessionDocument } | SummaryFailureView;

export function HistoryScreen({ api }: { api: ApiClient }) {
  const { route } = useAppLocation();
  const location = parseHistoryLocation(route.path);
  const [listAttempt, setListAttempt] = useState(0);
  const [summaryAttempt, setSummaryAttempt] = useState(0);
  const [listState, setListState] = useState<HistoryScreenState>({ status: "loading" });
  const [summaryState, setSummaryState] = useState<SummaryScreenState>({ status: "loading" });

  useEffect(() => {
    if (location.screen !== "list") {
      return;
    }

    let active = true;
    setListState({ status: "loading" });
    loadSessionHistory(api)
      .then((documents) => {
        if (active) {
          setListState(presentSessionHistory(documents));
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setListState(presentHistoryFailure(error));
        }
      });

    return () => {
      active = false;
    };
  }, [api, listAttempt, location.screen]);

  useEffect(() => {
    if (location.sessionId === null) {
      return;
    }

    const sessionId = location.sessionId;
    let active = true;
    setSummaryState({ status: "loading" });
    loadSessionSummary(api, sessionId)
      .then((document) => {
        if (active) {
          setSummaryState({ status: "ready", document });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setSummaryState(presentSummaryFailure(error));
        }
      });

    return () => {
      active = false;
    };
  }, [api, location.sessionId, summaryAttempt]);

  if (location.screen !== "list") {
    return (
      <SummaryRoute
        location={location}
        state={summaryState}
        onRetry={() => setSummaryAttempt((current) => current + 1)}
      />
    );
  }

  if (listState.status === "loading") {
    return <p className="muted">{historyCopy.loading}</p>;
  }

  if (listState.status === "error") {
    return (
      <section className="stack">
        <h1>{historyCopy.title}</h1>
        <article className="card stack">
          <p className="notice notice-alert" role="alert">
            {listState.message}
          </p>
          {listState.canRetry ? (
            <button type="button" className="button button-secondary" onClick={() => setListAttempt((current) => current + 1)}>
              {listState.retryLabel}
            </button>
          ) : null}
        </article>
      </section>
    );
  }

  return (
    <section className="stack">
      <h1>{listState.title}</h1>
      {listState.status === "empty" ? (
        <article className="card">
          <p>{listState.message}</p>
        </article>
      ) : (
        <ul className="choice-list">
          {listState.entries.map((entry) => (
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

function SummaryRoute({
  location,
  state,
  onRetry,
}: {
  location: HistoryLocation;
  state: SummaryScreenState;
  onRetry: () => void;
}) {
  if (state.status === "loading") {
    return <p className="muted">{summaryCopy.loading}</p>;
  }

  if (state.status === "not-found" || state.status === "error") {
    return (
      <section className="stack">
        <BackLink href={state.backHref} label={state.backLabel} />
        <h1>{summaryCopy.title}</h1>
        <article className="card stack">
          <p className="notice notice-alert" role="alert">
            {state.message}
          </p>
          {state.status === "error" ? (
            <button type="button" className="button button-secondary" onClick={onRetry}>
              {state.retryLabel}
            </button>
          ) : null}
        </article>
      </section>
    );
  }

  const view = presentSessionSummary(state.document);
  if (location.screen === "transactions") {
    return <TransactionHistory view={view} />;
  }

  if (location.screen === "player" && location.playerId !== null) {
    const player = presentSessionPlayer(state.document, location.playerId);
    return player === null ? <MissingPlayer summaryHref={view.summaryHref} /> : <PlayerTransactions player={player} />;
  }

  return <SummaryBody view={view} />;
}

function SummaryBody({ view }: { view: SessionSummaryView }) {
  return (
    <section className="stack evening">
      <BackLink href="/history" label={summaryCopy.back} />
      <header className="stack">
        <h1>{summaryCopy.title}</h1>
        <p>{view.date}</p>
        <p className="muted">
          {view.playersLabel} · {view.transactionsLabel}
        </p>
      </header>
      <article className="card totals">
        <p>
          <span className="muted">{summaryCopy.buyIns}</span>
          <strong>{view.totalBuyIns}</strong>
        </p>
        <p>
          <span className="muted">{summaryCopy.cashOuts}</span>
          <strong>{view.totalCashOuts}</strong>
        </p>
        <p>
          <span className="muted">{summaryCopy.balance}</span>
          <ResultText result={view.balance} prominent />
        </p>
      </article>
      <section className="stack">
        <h2>{summaryCopy.players}</h2>
        {view.players.length === 0 ? <p className="muted">{summaryCopy.emptyTransactions}</p> : null}
        <ul className="choice-list">
          {view.players.map((player) => (
            <li key={player.playerId}>
              <a className="player-row" href={player.href} onClick={(event) => onNavigate(event, player.href)}>
                <span className="player-row-main">
                  <span className="player-name">{player.name}</span>
                  <span className="muted">
                    {summaryCopy.buyIns} {player.totalBuyIns} · {summaryCopy.cashOuts} {player.totalCashOuts}
                  </span>
                </span>
                <ResultText result={player.net} prominent />
              </a>
            </li>
          ))}
        </ul>
      </section>
      <a href={view.transactionsHref} onClick={(event) => onNavigate(event, view.transactionsHref)}>
        {summaryCopy.transactions}
      </a>
    </section>
  );
}

function TransactionHistory({ view }: { view: SessionSummaryView }) {
  return (
    <section className="stack evening">
      <BackLink href={view.summaryHref} label={summaryCopy.backToSummary} />
      <header className="stack">
        <h1>{summaryCopy.transactions}</h1>
        <p>{view.date}</p>
      </header>
      <article className="card totals">
        <p>
          <span className="muted">{summaryCopy.balance}</span>
          <ResultText result={view.balance} prominent />
        </p>
      </article>
      <ReadOnlyTransactions items={view.transactions} empty={summaryCopy.emptyTransactions} />
    </section>
  );
}

function PlayerTransactions({
  player,
}: {
  player: { name: string; net: SessionSummaryView["balance"]; buyIns: string; cashOuts: string; transactions: PresentedTransaction[]; summaryHref: string };
}) {
  return (
    <section className="stack evening">
      <BackLink href={player.summaryHref} label={summaryCopy.backToSummary} />
      <header className="stack">
        <h1>{player.name}</h1>
        <ResultText result={player.net} prominent />
        <p className="muted">
          {summaryCopy.buyIns} {player.buyIns} · {summaryCopy.cashOuts} {player.cashOuts}
        </p>
      </header>
      <ReadOnlyTransactions items={player.transactions} empty={summaryCopy.missingPlayer} />
    </section>
  );
}

function MissingPlayer({ summaryHref }: { summaryHref: string }) {
  return (
    <section className="stack">
      <BackLink href={summaryHref} label={summaryCopy.backToSummary} />
      <article className="card">
        <p>{summaryCopy.missingPlayer}</p>
      </article>
    </section>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} onClick={(event) => onNavigate(event, href)}>
      {label}
    </a>
  );
}

function ReadOnlyTransactions({ items, empty }: { items: PresentedTransaction[]; empty: string }) {
  if (items.length === 0) {
    return <p className="muted">{empty}</p>;
  }

  return (
    <ul className="choice-list">
      {items.map((item) => (
        <li key={item.id}>
          <div className="activity-row">
            <span>
              <span className="player-name">{item.playerName}</span>
              <span className="muted">{item.typeLabel}</span>
            </span>
            <span className="money">{item.amount}</span>
            <span className="muted">{item.time}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
