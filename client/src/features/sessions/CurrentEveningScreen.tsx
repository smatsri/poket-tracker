import { useEffect, useState } from "react";
import type { EveningService } from "./evening.ts";
import type { PlayerDirectory } from "../players/directory.ts";
import type { ActiveSessionRecord, Player, Transaction } from "../../domain/models.ts";
import { navigate, onNavigate, useAppLocation } from "../../app/navigation.ts";
import { PlayerPanel } from "../players/PlayerPanel.tsx";
import { presentCurrentEvening, presentPlayerEvening, statusLabels, type ActiveEveningView, type PresentedTransaction } from "./currentEvening.ts";
import { ResultText } from "./ResultText.tsx";
import { classifySubmissionFailure, submissionActions, submissionMessages, type SubmissionFailure } from "./submission.ts";
import { TransactionSheet } from "./TransactionSheet.tsx";

export function CurrentEveningScreen({
  evening,
  players,
}: {
  evening: EveningService;
  players: PlayerDirectory;
}) {
  const { search } = useAppLocation();
  const [record, setRecord] = useState<ActiveSessionRecord | null>(null);
  const [directory, setDirectory] = useState<Player[]>([]);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ mode: "create"; playerId: string | null } | { mode: "edit"; transactionId: string } | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailure, setSubmitFailure] = useState<SubmissionFailure | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([evening.readCurrent(), players.load()])
      .then(([current, loaded]) => {
        if (!active) {
          return;
        }
        setRecord(current);
        setDirectory(loaded.players);
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [evening, players]);

  const view = presentCurrentEvening(ready ? record : null, directory);
  const actions = submissionActions(ready ? record : null);
  const locked = submitting || !actions.canMutate;
  const statusLabel = submitting || actions.canRetry ? statusLabels.pending : view.kind === "active" ? view.statusLabel : "";
  const playerId = search.get("player");
  const transactionId = search.get("transaction");
  const showHistory = search.get("view") === "transactions";
  const historyHref = "/?view=transactions";
  const detailReturn = showHistory ? historyHref : "/";
  const detail = record !== null && playerId !== null ? presentPlayerEvening(record, playerId, directory) : null;

  async function refreshEvening() {
    const [current, loaded] = await Promise.all([evening.readCurrent(), players.load()]);
    setRecord(current);
    setDirectory(loaded.players);
  }

  function openSheet(playerId: string | null) {
    if (view.kind !== "active" || locked) {
      return;
    }
    setSheet({ mode: "create", playerId });
  }

  function openEditor(transaction: Transaction) {
    if (view.kind !== "active" || locked) {
      return;
    }
    setSheet({ mode: "edit", transactionId: transaction.id });
  }

  async function finishEvening() {
    if (submitting || (!actions.canFinish && !actions.canRetry)) {
      return;
    }

    setSubmitting(true);
    setSubmitFailure(null);
    try {
      setRecord(await evening.submitEvening());
      setReviewing(false);
    } catch (error) {
      try {
        setRecord(await evening.readCurrent());
      } catch {
        // Keep the evening already on screen. Submission leaves it pending in local storage.
      }
      setSubmitFailure(classifySubmissionFailure(error));
      setReviewing(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function startEvening() {
    if (!actions.canStartAnother || submitting || starting) {
      return;
    }

    setStarting(true);
    setStartError(null);
    try {
      setRecord(await evening.startEvening());
      navigate("/");
    } catch {
      setStartError("אי אפשר להתחיל ערב חדש כל עוד הערב הנוכחי פתוח או ממתין לשליחה.");
    } finally {
      setStarting(false);
    }
  }

  const editing = sheet?.mode === "edit" ? (record?.session.transactions.find((item) => item.id === sheet.transactionId) ?? null) : null;
  const transactionSheet =
    sheet !== null && (sheet.mode === "create" || editing !== null) ? (
      <TransactionSheet
        key={sheet.mode === "edit" ? sheet.transactionId : `create:${sheet.playerId ?? ""}`}
        presetPlayerId={sheet.mode === "create" ? sheet.playerId : null}
        editing={editing}
        directory={players}
        evening={evening}
        onClose={() => setSheet(null)}
        onPersisted={refreshEvening}
      />
    ) : null;

  if (!ready) {
    return <p className="muted">טוען את הערב…</p>;
  }

  if (view.kind === "empty") {
    return (
      <section className="stack">
        <h1>ערב נוכחי</h1>
        <article className="card stack">
          <p>אין ערב פעיל.</p>
          <button type="button" className="button button-primary" disabled={starting} onClick={() => void startEvening()}>
            התחלת ערב חדש
          </button>
          {startError !== null ? <p className="notice notice-alert">{startError}</p> : null}
        </article>
        <PlayerPanel directory={players} onSelect={() => undefined} />
      </section>
    );
  }

  if (transactionId !== null && record !== null) {
    const transaction = record.session.transactions.find((item) => item.id === transactionId) ?? null;
    const presented = view.history.find((item) => item.id === transactionId) ?? null;
    return (
      <section className="stack evening">
        <a href={detailReturn} onClick={(event) => onNavigate(event, detailReturn)}>
          {showHistory ? "חזרה לכל הפעולות" : "חזרה לערב"}
        </a>
        {transaction === null || presented === null ? (
          <article className="card">
            <p>הפעולה לא נמצאה.</p>
          </article>
        ) : (
          <TransactionDetail
            transaction={transaction}
            presented={presented}
            canCorrect={!locked}
            evening={evening}
            onChanged={refreshEvening}
            onEdit={() => openEditor(transaction)}
            returnTo={detailReturn}
          />
        )}
        {transactionSheet}
      </section>
    );
  }

  if (showHistory) {
    return (
      <section className="stack evening">
        <a href="/" onClick={(event) => onNavigate(event, "/")}>
          חזרה לערב
        </a>
        <header className="stack">
          <h1>כל הפעולות</h1>
          <p>{view.date}</p>
          <p className="status">{statusLabel}</p>
        </header>
        <article className="card totals">
          <p>
            <span className="muted">מאזן</span>
            <ResultText result={view.balance} prominent />
          </p>
        </article>
        {view.history.length === 0 ? (
          <article className="card">
            <p>אין עדיין פעולות.</p>
          </article>
        ) : (
          <TransactionList items={view.history} empty="אין עדיין פעולות." scope="history" />
        )}
        <AddAction disabled={locked} onAdd={() => openSheet(null)} />
        <SubmissionPanel
          view={view}
          reviewing={reviewing}
          submitting={submitting}
          failure={submitFailure}
          canFinish={actions.canFinish}
          canRetry={actions.canRetry}
          onReview={() => setReviewing(true)}
          onCancel={() => setReviewing(false)}
          onSubmit={() => void finishEvening()}
        />
        {transactionSheet}
      </section>
    );
  }

  if (playerId !== null) {
    return (
      <section className="stack evening">
        <a href="/" onClick={(event) => onNavigate(event, "/")}>
          חזרה לערב
        </a>
        {detail === null ? (
          <article className="card">
            <p>לשחקן הזה אין פעולות בערב הנוכחי.</p>
          </article>
        ) : (
          <>
            <header className="stack">
              <h1>{detail.name}</h1>
              <ResultText result={detail.net} prominent />
              <p className="muted">
                כניסות {detail.buyIns} · יציאות {detail.cashOuts}
              </p>
            </header>
            <TransactionList items={detail.transactions} empty="אין פעולות לשחקן הזה." scope="evening" />
          </>
        )}
        <AddAction disabled={locked} onAdd={() => openSheet(playerId)} />
        {transactionSheet}
      </section>
    );
  }

  return (
    <section className="stack evening">
      <header className="stack">
        <h1>{view.title}</h1>
        <p>{view.date}</p>
        <p className="status">{statusLabel}</p>
      </header>
      <AddAction disabled={locked} onAdd={() => openSheet(null)} />
      <article className="card totals">
        <p>
          <span className="muted">כניסות</span>
          <strong>{view.totalBuyIns}</strong>
        </p>
        <p>
          <span className="muted">יציאות</span>
          <strong>{view.totalCashOuts}</strong>
        </p>
        <p>
          <span className="muted">מאזן</span>
          <ResultText result={view.balance} prominent />
        </p>
      </article>
      <section className="stack">
        <h2>שחקנים</h2>
        {view.players.length === 0 ? <p className="muted">עדיין אין פעולות בערב.</p> : null}
        <ul className="choice-list">
          {view.players.map((player) => (
            <li key={player.playerId}>
              <a className="player-row" href={`/?player=${encodeURIComponent(player.playerId)}`} onClick={(event) => onNavigate(event, `/?player=${encodeURIComponent(player.playerId)}`)}>
                <span className="player-row-main">
                  <span className="player-name">{player.name}</span>
                  <span className="muted">
                    כניסות {player.totalBuyIns} · יציאות {player.totalCashOuts}
                  </span>
                </span>
                <ResultText result={player.net} prominent />
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section className="stack">
        <h2>פעולות אחרונות</h2>
        <TransactionList items={view.recent} empty="אין עדיין פעולות." scope="evening" />
        <a href={historyHref} onClick={(event) => onNavigate(event, historyHref)}>
          כל הפעולות
        </a>
      </section>
      <SubmissionPanel
        view={view}
        reviewing={reviewing}
        submitting={submitting}
        failure={submitFailure}
        canFinish={actions.canFinish}
        canRetry={actions.canRetry}
        onReview={() => setReviewing(true)}
        onCancel={() => setReviewing(false)}
        onSubmit={() => void finishEvening()}
      />
      {actions.canStartAnother && !submitting ? (
        <button type="button" className="button button-secondary" disabled={starting} onClick={() => void startEvening()}>
          התחלת ערב חדש
        </button>
      ) : null}
      {startError !== null ? <p className="notice notice-alert">{startError}</p> : null}
      <PlayerPanel directory={players} onSelect={() => undefined} />
      {transactionSheet}
    </section>
  );
}

function SubmissionPanel({
  view,
  reviewing,
  submitting,
  failure,
  canFinish,
  canRetry,
  onReview,
  onCancel,
  onSubmit,
}: {
  view: ActiveEveningView;
  reviewing: boolean;
  submitting: boolean;
  failure: SubmissionFailure | null;
  canFinish: boolean;
  canRetry: boolean;
  onReview: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  if (reviewing || submitting) {
    return (
      <article className="card stack">
        <h2>סיכום לפני שליחה</h2>
        <p>
          <span className="muted">כניסות </span>
          <strong>{view.totalBuyIns}</strong>
        </p>
        <p>
          <span className="muted">יציאות </span>
          <strong>{view.totalCashOuts}</strong>
        </p>
        <p>
          <span className="muted">מאזן </span>
          <ResultText result={view.balance} prominent />
        </p>
        <ul className="choice-list">
          {view.players.map((player) => (
            <li key={player.playerId} className="player-row">
              <span className="player-name">{player.name}</span>
              <ResultText result={player.net} />
            </li>
          ))}
        </ul>
        {submitting ? <p className="status">ממתין לשליחה</p> : null}
        <div className="action-row">
          <button type="button" className="button button-primary" disabled={submitting} onClick={onSubmit}>
            שליחת הערב
          </button>
          <button type="button" className="button button-secondary" disabled={submitting} onClick={onCancel}>
            חזרה
          </button>
        </div>
      </article>
    );
  }

  return (
    <>
      {failure !== null ? (
        <p className="notice notice-alert" role="alert">
          {submissionMessages[failure]}
        </p>
      ) : null}
      {canFinish ? (
        <button type="button" className="button button-secondary" onClick={onReview}>
          סיום הערב
        </button>
      ) : null}
      {canRetry ? (
        <article className="card stack">
          <p className="status">ממתין לשליחה</p>
          {failure === null ? <p>הערב נשמר במכשיר ומחכה לשליחה.</p> : null}
          <button type="button" className="button button-primary" onClick={onSubmit}>
            שליחה מחדש
          </button>
        </article>
      ) : null}
    </>
  );
}

function AddAction({ disabled, onAdd }: { disabled: boolean; onAdd: () => void }) {
  return (
    <button type="button" className="button button-primary add-action" disabled={disabled} onClick={onAdd}>
      + הוספת פעולה
    </button>
  );
}

function TransactionList({
  items,
  empty,
  scope,
}: {
  items: PresentedTransaction[];
  empty: string;
  scope: "history" | "evening";
}) {
  if (items.length === 0) {
    return <p className="muted">{empty}</p>;
  }

  return (
    <ul className="choice-list">
      {items.map((item) => {
        const params = new URLSearchParams();
        if (scope === "history") {
          params.set("view", "transactions");
        }
        params.set("transaction", item.id);
        const href = `/?${params.toString()}`;
        return (
          <li key={item.id}>
            <a className="activity-row" href={href} onClick={(event) => onNavigate(event, href)}>
              <span>
                <span className="player-name">{item.playerName}</span>
                <span className="muted">{item.typeLabel}</span>
              </span>
              <span className="money">{item.amount}</span>
              <span className="muted">{item.time}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function TransactionDetail({
  transaction,
  presented,
  canCorrect,
  evening,
  onChanged,
  onEdit,
  returnTo,
}: {
  transaction: Transaction;
  presented: PresentedTransaction;
  canCorrect: boolean;
  evening: EveningService;
  onChanged: () => Promise<void>;
  onEdit: () => void;
  returnTo: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setDeleting(true);
    setError(null);
    let removed = false;
    try {
      await evening.deleteTransaction(transaction.id);
      removed = true;
      await onChanged();
    } catch {
      if (!removed) {
        setError("לא הצלחנו למחוק את הפעולה.");
        return;
      }
    } finally {
      setDeleting(false);
    }
    navigate(returnTo);
  }

  return (
    <>
      <header className="stack">
        <h1>{presented.playerName}</h1>
        <p>{presented.typeLabel}</p>
        <p className="money money-prominent">{presented.amount}</p>
        <p className="muted">{presented.time}</p>
      </header>
      {canCorrect ? (
        <div className="action-row">
          <button type="button" className="button button-secondary" onClick={onEdit}>
            עריכה
          </button>
          <button type="button" className="button button-destructive" onClick={() => setConfirming(true)}>
            מחיקה
          </button>
        </div>
      ) : null}
      {confirming ? (
        <div className="notice stack" role="status">
          <p>למחוק את הפעולה?</p>
          <div className="action-row">
            <button type="button" className="button button-destructive" disabled={deleting} onClick={() => void remove()}>
              מחיקה
            </button>
            <button type="button" className="button button-secondary" disabled={deleting} onClick={() => setConfirming(false)}>
              להשאיר
            </button>
          </div>
        </div>
      ) : null}
      {error !== null ? (
        <p className="notice notice-alert" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
