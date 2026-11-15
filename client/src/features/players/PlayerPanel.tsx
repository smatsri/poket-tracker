import { useEffect, useRef, useState } from "react";
import { formatSignedAmount } from "../../data/local/operatorSettings.ts";
import type { Player, Transaction } from "../../domain/models.ts";
import { createSingleFlight } from "../singleFlight.ts";
import { useOperatorSettings } from "../settings/OperatorSettings.tsx";
import { createPlayerNet } from "../sessions/transactionForm.ts";
import type { PlayerDirectory } from "./directory.ts";
import { playerDisplayName } from "./playerName.ts";

const cachedPlayersNote = "לא הצלחנו לרענן את הרשימה. אפשר לבחור מהשחקנים השמורים.";
const emptyLoadNote = "לא הצלחנו לטעון שחקנים מהשרת. אפשר לנסות שוב כשהחיבור חוזר.";

export function PlayerPanel({
  directory,
  onSelect,
  selectedId: controlledId,
  selectedIds,
  multiple = false,
  manage = true,
  onPlayersChange,
  eveningTransactions,
}: {
  directory: PlayerDirectory;
  onSelect: (player: Player) => void;
  selectedId?: string | null;
  selectedIds?: readonly string[];
  multiple?: boolean;
  manage?: boolean;
  onPlayersChange?: (players: Player[]) => void;
  eveningTransactions?: readonly Transaction[];
}) {
  const { settings } = useOperatorSettings();
  const [players, setPlayers] = useState<Player[]>([]);
  const [internalId, setInternalId] = useState<string | null>(null);
  const selectedId = controlledId === undefined ? internalId : controlledId;
  const [loadNote, setLoadNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<Player | null>(null);
  const [name, setName] = useState("");
  const [rename, setRename] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const flight = useRef(createSingleFlight());

  useEffect(() => {
    let active = true;
    directory
      .load()
      .then((result) => {
        if (!active) {
          return;
        }
        setPlayers(result.players);
        if (result.ok) {
          setLoadNote(null);
          return;
        }
        setLoadNote(result.players.length > 0 ? cachedPlayersNote : emptyLoadNote);
      })
      .catch(() => {
        if (active) {
          setLoadNote(emptyLoadNote);
        }
      });
    return () => {
      active = false;
    };
  }, [directory]);

  function select(player: Player) {
    if (!multiple && controlledId === undefined) {
      setInternalId(player.id);
    }
    onSelect(player);
  }

  const chosenIds = selectedIds !== undefined ? [...selectedIds] : selectedId === null ? [] : [selectedId];
  const managedId = manage && chosenIds.length === 1 ? chosenIds[0] : null;
  const managed = managedId === undefined ? null : (players.find((player) => player.id === managedId) ?? null);

  useEffect(() => {
    setRename(managed?.name ?? "");
    setConfirmDelete(false);
    setManageError(null);
  }, [managed?.id, managed?.name]);

  async function save(confirmDuplicate: boolean) {
    await flight.current(async () => {
      setSaving(true);
      setError(null);
      try {
        const result = await directory.create(name, { confirmDuplicate });
        setPlayers(result.players);
        if (result.ok) {
          setName("");
          setDuplicate(null);
          select(result.player);
          return;
        }
        if (result.reason === "duplicate") {
          setDuplicate(result.match);
          return;
        }
        setDuplicate(null);
        setError(result.message);
      } finally {
        setSaving(false);
      }
    });
  }

  return (
    <section className="card stack" aria-label="שחקנים">
      <h2>שחקנים</h2>
      {loadNote !== null ? <p className="notice">{loadNote}</p> : null}
      {players.length === 0 ? <p className="muted">אין עדיין שחקנים.</p> : null}
      {players.length > 0 ? (
        <ul className="choice-list">
          {players.map((player) => (
            <li key={player.id}>
              <button
                type="button"
                className="choice"
                aria-pressed={chosenIds.includes(player.id)}
                onClick={() => select(player)}
              >
                <span>{playerDisplayName(player.id, players)}</span>
                {eveningTransactions !== undefined ? (
                  <span dir="ltr">{formatSignedAmount(createPlayerNet(player.id, eveningTransactions), settings.currencyLabel)}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {chosenIds.length === 1 && !manage ? <p>נבחר לפעולה: {playerDisplayName(chosenIds[0] ?? "", players)}</p> : null}
      {chosenIds.length > 1 ? (
        <p>נבחרו לפעולה: {chosenIds.map((id) => playerDisplayName(id, players)).join(", ")}</p>
      ) : null}
      {managed !== null ? (
        <form
          className="stack"
          aria-label="ניהול שחקן"
          onSubmit={(event) => {
            event.preventDefault();
            void flight.current(async () => {
              setSaving(true);
              setManageError(null);
              try {
                const result = await directory.rename(managed.id, rename);
                setPlayers(result.players);
                onPlayersChange?.(result.players);
                if (!result.ok) {
                  setManageError(result.message);
                }
              } finally {
                setSaving(false);
              }
            });
          }}
        >
          <label className="stack field-label">
            <span>שינוי שם</span>
            <input
              className="field"
              name="player-rename"
              value={rename}
              required
              maxLength={80}
              autoComplete="name"
              onChange={(event) => {
                setRename(event.target.value);
                setManageError(null);
              }}
            />
          </label>
          <button type="submit" className="button button-secondary" disabled={saving}>
            שמירת שם
          </button>
          {confirmDelete ? (
            <div className="notice stack" role="status">
              <p>למחוק את {managed.name}?</p>
              <button
                type="button"
                className="button button-destructive"
                disabled={saving}
                onClick={() =>
                  void flight.current(async () => {
                    setSaving(true);
                    setManageError(null);
                    try {
                      const result = await directory.remove(managed.id);
                      setPlayers(result.players);
                      onPlayersChange?.(result.players);
                      if (result.ok) {
                        if (controlledId === undefined) {
                          setInternalId(null);
                        }
                        setConfirmDelete(false);
                        return;
                      }
                      setManageError(result.message);
                    } finally {
                      setSaving(false);
                    }
                  })
                }
              >
                מחיקה
              </button>
            </div>
          ) : (
            <button type="button" className="button button-destructive" disabled={saving} onClick={() => setConfirmDelete(true)}>
              מחיקה
            </button>
          )}
          {manageError !== null ? (
            <p className="notice notice-alert" role="alert">
              {manageError}
            </p>
          ) : null}
        </form>
      ) : null}
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          void save(false);
        }}
      >
        <label className="stack field-label">
          <span>שם</span>
          <input
            className="field"
            name="player-name"
            value={name}
            required
            maxLength={80}
            autoComplete="name"
            onChange={(event) => {
              setName(event.target.value);
              setDuplicate(null);
              setError(null);
            }}
          />
        </label>
        {duplicate !== null ? (
          <div className="notice" role="status">
            <p>כבר קיים שחקן בשם {duplicate.name}. ליצור שחקן נוסף בכל זאת?</p>
            <button type="button" className="button button-secondary" disabled={saving} onClick={() => void save(true)}>
              יצירה בכל זאת
            </button>
          </div>
        ) : null}
        {error !== null ? (
          <p className="notice notice-alert" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="button button-primary" disabled={saving}>
          שמירת שחקן
        </button>
      </form>
    </section>
  );
}
