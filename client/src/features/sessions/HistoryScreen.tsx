import { useEffect, useState } from "react";
import { onNavigate, useAppLocation } from "../../app/navigation.ts";
import type { ApiClient } from "../../data/api/client.ts";
import type { LocalRepository } from "../../data/local/repository.ts";
import { MoneyText, ResultText } from "./ResultText.tsx";
import {
  deleteConfirmation,
  historyCopy,
  openArchivedSessionHistory,
  openSessionHistory,
  parseHistoryLocation,
  rememberClosedSession,
  removeClosedSession,
  type HistoryEntry,
  type HistoryLocation,
  type HistoryScreenView,
} from "./sessionHistory.ts";
import {
  openSessionSummary,
  presentSessionPlayer,
  presentSessionSummary,
  summaryCopy,
  type SessionSummaryView,
  type SummaryScreenView,
} from "./sessionSummary.ts";
import type { PresentedTransaction } from "./transactionHistory.ts";

export function HistoryScreen({ api, repository }: { api: ApiClient; repository: LocalRepository }) {
  const { route } = useAppLocation();
  const location = parseHistoryLocation(route.path);
  const [listAttempt, setListAttempt] = useState(0);
  const [summaryAttempt, setSummaryAttempt] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [listState, setListState] = useState<HistoryScreenView>({ status: "loading" });
  const [summaryState, setSummaryState] = useState<SummaryScreenView>({ status: "loading" });

  useEffect(() => {
    if (location.screen !== "list") {
      return;
    }

    let active = true;
    const show = (view: HistoryScreenView) => {
      if (active) {
        setListState(view);
      }
    };
    void (showArchived ? openArchivedSessionHistory(api, show) : openSessionHistory(repository, api, show));

    return () => {
      active = false;
    };
  }, [api, listAttempt, location.screen, repository, showArchived]);

  useEffect(() => {
    if (location.sessionId === null) {
      return;
    }

    const sessionId = location.sessionId;
    let active = true;
    void openSessionSummary(repository, api, sessionId, (view) => {
      if (active) {
        setSummaryState(view);
      }
    });

    return () => {
      active = false;
    };
  }, [api, location.sessionId, repository, summaryAttempt]);

  if (location.screen !== "list") {
    return (
      <SummaryRoute
        location={location}
        state={summaryState}
        onRetry={() => setSummaryAttempt((current) => current + 1)}
      />
    );
  }

  async function archive(entry: HistoryEntry) {
    await runAction(async () => {
      await api.archiveSession(entry.id);
      await removeClosedSession(repository, entry.id);
    });
  }

  async function restore(entry: HistoryEntry) {
    await runAction(async () => {
      const document = await api.restoreSession(entry.id);
      await rememberClosedSession(repository, document);
    });
  }

  async function remove(entry: HistoryEntry) {
    if (!window.confirm(deleteConfirmation(entry.heading))) {
      return;
    }

    await runAction(async () => {
      await api.deleteSession(entry.id);
      await removeClosedSession(repository, entry.id);
    });
  }

  async function runAction(action: () => Promise<void>) {
    if (acting) {
      return;
    }

    setActing(true);
    setActionError(null);
    try {
      await action();
      setListAttempt((current) => current + 1);
    } catch {
      setActionError(historyCopy.actionError);
    } finally {
      setActing(false);
    }
  }

  const listToggle = (
    <button type="button" className="button button-secondary" onClick={() => setShowArchived((current) => !current)}>
      {showArchived ? historyCopy.showActive : historyCopy.showArchived}
    </button>
  );

  if (listState.status === "loading") {
    return (
      <section className="stack">
        <h1>{showArchived ? historyCopy.archivedTitle : historyCopy.title}</h1>
        {listToggle}
        <p className="muted">{historyCopy.loading}</p>
      </section>
    );
  }

  if (listState.status === "error") {
    return (
      <section className="stack">
        <h1>{showArchived ? historyCopy.archivedTitle : historyCopy.title}</h1>
        {listToggle}
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
      {listToggle}
      {actionError !== null ? (
        <p className="notice notice-alert" role="alert">
          {actionError}
        </p>
      ) : null}
      {listState.notice !== null ? (
        <p className="notice" role="status">
          {listState.notice}
        </p>
      ) : null}
      {listState.status === "empty" ? (
        <article className="card">
          <p>{listState.message}</p>
        </article>
      ) : (
        <ul className="choice-list">
          {listState.entries.map((entry) => (
            <li key={entry.id} className="card stack">
              <a className="player-row" href={entry.href} onClick={(event) => onNavigate(event, entry.href)}>
                <span className="player-row-main">
                  <span>
                    {entry.moneyInLabel} <MoneyText value={entry.moneyIn} />
                  </span>
                  <span>
                    {entry.moneyOutLabel} <MoneyText value={entry.moneyOut} />
                  </span>
                  <span>
                    {entry.gapLabel} <ResultText result={entry.result} prominent />
                  </span>
                  <span className="player-name">{entry.heading}</span>
                  {entry.location !== undefined ? <span className="muted">{entry.location}</span> : null}
                  <span className="muted">
                    {entry.playersLabel} · {entry.moneyInCountLabel} · {entry.cashOutCountLabel}
                  </span>
                </span>
              </a>
              <div className="action-row">
                {showArchived ? (
                  <button type="button" className="button button-secondary" disabled={acting} onClick={() => void restore(entry)}>
                    {historyCopy.restore}
                  </button>
                ) : (
                  <button type="button" className="button button-secondary" disabled={acting} onClick={() => void archive(entry)}>
                    {historyCopy.archive}
                  </button>
                )}
                <button type="button" className="button button-destructive" disabled={acting} onClick={() => void remove(entry)}>
                  {historyCopy.delete}
                </button>
              </div>
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
  state: SummaryScreenView;
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
    return <TransactionHistory view={view} notice={state.notice} />;
  }

  if (location.screen === "player" && location.playerId !== null) {
    const player = presentSessionPlayer(state.document, location.playerId);
    return player === null ? (
      <MissingPlayer summaryHref={view.summaryHref} notice={state.notice} />
    ) : (
      <PlayerTransactions player={player} notice={state.notice} />
    );
  }

  return <SummaryBody view={view} notice={state.notice} />;
}

function CacheNotice({ notice }: { notice: string | null }) {
  if (notice === null) {
    return null;
  }

  return (
    <p className="notice" role="status">
      {notice}
    </p>
  );
}

function SummaryBody({ view, notice }: { view: SessionSummaryView; notice: string | null }) {
  return (
    <section className="stack evening">
      <CacheNotice notice={notice} />
      <BackLink href="/history" label={summaryCopy.back} />
      <header className="stack">
        <h1>{summaryCopy.title}</h1>
        <p>{view.heading}</p>
        {view.location !== undefined ? <p>{view.location}</p> : null}
        <p className="muted">
          {view.playersLabel} · {view.transactionsLabel}
        </p>
      </header>
      <article className="card totals">
        <p>
          <span className="muted">{summaryCopy.buyIns}</span>
          <strong>
            <MoneyText value={view.totalBuyIns} />
          </strong>
        </p>
        <p>
          <span className="muted">{summaryCopy.cashOuts}</span>
          <strong>
            <MoneyText value={view.totalCashOuts} />
          </strong>
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
                    {summaryCopy.buyIns} <MoneyText value={player.totalBuyIns} /> · {summaryCopy.cashOuts}{" "}
                    <MoneyText value={player.totalCashOuts} />
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

function TransactionHistory({ view, notice }: { view: SessionSummaryView; notice: string | null }) {
  return (
    <section className="stack evening">
      <CacheNotice notice={notice} />
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
  notice,
}: {
  player: { name: string; net: SessionSummaryView["balance"]; buyIns: string; cashOuts: string; transactions: PresentedTransaction[]; summaryHref: string };
  notice: string | null;
}) {
  return (
    <section className="stack evening">
      <CacheNotice notice={notice} />
      <BackLink href={player.summaryHref} label={summaryCopy.backToSummary} />
      <header className="stack">
        <h1>{player.name}</h1>
        <ResultText result={player.net} prominent />
        <p className="muted">
          {summaryCopy.buyIns} <MoneyText value={player.buyIns} /> · {summaryCopy.cashOuts} <MoneyText value={player.cashOuts} />
        </p>
      </header>
      <ReadOnlyTransactions items={player.transactions} empty={summaryCopy.missingPlayer} />
    </section>
  );
}

function MissingPlayer({ summaryHref, notice }: { summaryHref: string; notice: string | null }) {
  return (
    <section className="stack">
      <CacheNotice notice={notice} />
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
            <MoneyText value={item.amount} />
            <span className="muted">{item.time}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
