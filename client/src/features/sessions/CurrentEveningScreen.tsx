import { useEffect, useState } from "react";
import type { EveningService } from "./evening.ts";
import type { PlayerDirectory } from "../players/directory.ts";
import type { ActiveSessionRecord, Player, Transaction } from "../../domain/models.ts";
import { navigate, onNavigate, useAppLocation } from "../../app/navigation.ts";
import { PlayerPanel } from "../players/PlayerPanel.tsx";
import { presentCurrentEvening, presentPlayerEvening, type PresentedResult, type PresentedTransaction } from "./currentEvening.ts";
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
  const playerId = search.get("player");
  const transactionId = search.get("transaction");
  const showHistory = search.get("view") === "transactions";
  const detail = record !== null && playerId !== null ? presentPlayerEvening(record, playerId, directory) : null;

  async function refreshEvening() {
    const [current, loaded] = await Promise.all([evening.readCurrent(), players.load()]);
    setRecord(current);
    setDirectory(loaded.players);
  }

  function openSheet(playerId: string | null) {
    if (view.kind !== "active" || !view.canRecord) {
      return;
    }
    setSheet({ mode: "create", playerId });
  }

  function openEditor(transaction: Transaction) {
    if (view.kind !== "active" || !view.canRecord) {
      return;
    }
    setSheet({ mode: "edit", transactionId: transaction.id });
  }

  async function startEvening() {
    if (!view.canStart || starting) {
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
        <a href="/" onClick={(event) => onNavigate(event, "/")}>
          חזרה לערב
        </a>
        {transaction === null || presented === null ? (
          <article className="card">
            <p>הפעולה לא נמצאה.</p>
          </article>
        ) : (
          <TransactionDetail
            transaction={transaction}
            presented={presented}
            canCorrect={view.canRecord}
            evening={evening}
            onChanged={refreshEvening}
            onEdit={() => openEditor(transaction)}
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
        <h1>כל הפעולות</h1>
        <p className="muted">{view.date}</p>
        <TransactionList items={view.history} empty="אין עדיין פעולות." />
        <AddAction disabled={!view.canRecord} onAdd={() => openSheet(null)} />
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
            <TransactionList items={detail.transactions} empty="אין פעולות לשחקן הזה." />
          </>
        )}
        <AddAction disabled={!view.canRecord} onAdd={() => openSheet(playerId)} />
        {transactionSheet}
      </section>
    );
  }

  return (
    <section className="stack evening">
      <header className="stack">
        <h1>{view.title}</h1>
        <p>{view.date}</p>
        <p className="status">{view.statusLabel}</p>
      </header>
      <AddAction disabled={!view.canRecord} onAdd={() => openSheet(null)} />
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
        <TransactionList items={view.recent} empty="אין עדיין פעולות." />
        <a href="/?view=transactions" onClick={(event) => onNavigate(event, "/?view=transactions")}>
          כל הפעולות
        </a>
      </section>
      {view.canStart ? (
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

function AddAction({ disabled, onAdd }: { disabled: boolean; onAdd: () => void }) {
  return (
    <button type="button" className="button button-primary add-action" disabled={disabled} onClick={onAdd}>
      + הוספת פעולה
    </button>
  );
}

function TransactionList({ items, empty }: { items: PresentedTransaction[]; empty: string }) {
  if (items.length === 0) {
    return <p className="muted">{empty}</p>;
  }

  return (
    <ul className="choice-list">
      {items.map((item) => {
        const href = `/?transaction=${encodeURIComponent(item.id)}`;
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
}: {
  transaction: Transaction;
  presented: PresentedTransaction;
  canCorrect: boolean;
  evening: EveningService;
  onChanged: () => Promise<void>;
  onEdit: () => void;
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
    navigate("/");
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

function ResultText({ result, prominent = false }: { result: PresentedResult; prominent?: boolean }) {
  return (
    <span dir="ltr" className={`money money-${result.tone}${prominent ? " money-prominent" : ""}`}>
      {result.text}
    </span>
  );
}
