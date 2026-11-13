import { useEffect, useRef, useState } from "react";
import type { Player } from "../../domain/models.ts";
import { createSingleFlight } from "../singleFlight.ts";
import type { PlayerDirectory } from "./directory.ts";

const cachedPlayersNote = "לא הצלחנו לרענן את הרשימה. אפשר לבחור מהשחקנים השמורים.";
const emptyLoadNote = "לא הצלחנו לטעון שחקנים מהשרת. אפשר לנסות שוב כשהחיבור חוזר.";

export function PlayerPanel({
  directory,
  onSelect,
  selectedId: controlledId,
}: {
  directory: PlayerDirectory;
  onSelect: (player: Player) => void;
  selectedId?: string | null;
}) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [internalId, setInternalId] = useState<string | null>(null);
  const selectedId = controlledId === undefined ? internalId : controlledId;
  const [loadNote, setLoadNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<Player | null>(null);
  const [name, setName] = useState("");
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

  const selected = players.find((player) => player.id === selectedId) ?? null;

  function select(player: Player) {
    if (controlledId === undefined) {
      setInternalId(player.id);
    }
    onSelect(player);
  }

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
                aria-pressed={player.id === selectedId}
                onClick={() => select(player)}
              >
                {player.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {selected !== null ? <p>נבחר לפעולה: {selected.name}</p> : null}
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
