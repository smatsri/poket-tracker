import { useEffect, useState } from "react";
import type { EveningService } from "./evening.ts";
import type { PlayerDirectory } from "../players/directory.ts";
import type { ActiveSessionRecord, Player } from "../../domain/models.ts";
import { navigate, onNavigate, useAppLocation } from "../../app/navigation.ts";
import { PlayerPanel } from "../players/PlayerPanel.tsx";
import { presentCurrentEvening, presentPlayerEvening, type PresentedResult } from "./currentEvening.ts";
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
  const [sheet, setSheet] = useState<{ playerId: string | null } | null>(null);

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
    setSheet({ playerId });
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

  const transactionSheet =
    sheet !== null ? (
      <TransactionSheet
        presetPlayerId={sheet.playerId}
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

function TransactionList({ items, empty }: { items: { id: string; playerName: string; typeLabel: string; amount: string; time: string }[]; empty: string }) {
  if (items.length === 0) {
    return <p className="muted">{empty}</p>;
  }

  return (
    <ul className="choice-list">
      {items.map((item) => (
        <li key={item.id} className="activity-row">
          <span>
            <span className="player-name">{item.playerName}</span>
            <span className="muted">{item.typeLabel}</span>
          </span>
          <span className="money">{item.amount}</span>
          <span className="muted">{item.time}</span>
        </li>
      ))}
    </ul>
  );
}

function ResultText({ result, prominent = false }: { result: PresentedResult; prominent?: boolean }) {
  return (
    <span dir="ltr" className={`money money-${result.tone}${prominent ? " money-prominent" : ""}`}>
      {result.text}
    </span>
  );
}
