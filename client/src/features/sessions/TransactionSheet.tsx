import { useEffect, useRef, useState } from "react";
import type { PlayerDirectory } from "../players/directory.ts";
import { PlayerPanel } from "../players/PlayerPanel.tsx";
import { createSingleFlight } from "../singleFlight.ts";
import type { Transaction } from "../../domain/models.ts";
import type { EveningService } from "./evening.ts";
import {
  amountFieldProps,
  draftAfterSave,
  draftFromTransaction,
  editedTransaction,
  emptyTransactionDraft,
  transactionTypeChoices,
  validateTransactionDraft,
  type TransactionDraft,
  type TransactionFieldErrors,
} from "./transactionForm.ts";

export function TransactionSheet({
  presetPlayerId,
  editing,
  directory,
  evening,
  onClose,
  onPersisted,
}: {
  presetPlayerId: string | null;
  editing: Transaction | null;
  directory: PlayerDirectory;
  evening: EveningService;
  onClose: () => void;
  onPersisted: () => Promise<void>;
}) {
  const amountRef = useRef<HTMLInputElement>(null);
  const flight = useRef(createSingleFlight());
  const [draft, setDraft] = useState<TransactionDraft>(() =>
    editing === null ? emptyTransactionDraft(presetPlayerId) : draftFromTransaction(editing),
  );
  const [errors, setErrors] = useState<TransactionFieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [amountFocus, setAmountFocus] = useState(0);
  const [undoId, setUndoId] = useState<string | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    if (amountFocus > 0) {
      amountRef.current?.focus();
    }
  }, [amountFocus]);

  async function save() {
    const result = validateTransactionDraft(draft);
    if (!result.ok) {
      setErrors(result.errors);
      setSaveError(null);
      return;
    }

    await flight.current(async () => {
      setSaving(true);
      setErrors({});
      setSaveError(null);
      if (editing !== null) {
        try {
          await evening.updateTransaction(editedTransaction(editing, result.value));
          await onPersisted();
        } catch {
          setSaveError("לא הצלחנו לשמור את הפעולה.");
          return;
        } finally {
          setSaving(false);
        }
        onClose();
        return;
      }

      let savedId: string | null = null;
      try {
        savedId = (await evening.addTransaction(result.value)).id;
      } catch {
        setSaveError("לא הצלחנו לשמור את הפעולה.");
        return;
      } finally {
        setSaving(false);
      }

      setDraft(draftAfterSave(draft));
      setUndoId(savedId);
      setUndoError(null);
      setAmountFocus((current) => current + 1);
      try {
        await onPersisted();
      } catch {
        setSaveError("הפעולה נשמרה, אבל הערב לא התרענן.");
      }
    });
  }

  async function undo() {
    if (undoId === null || undoing) {
      return;
    }

    setUndoing(true);
    setUndoError(null);
    let removed = false;
    try {
      await evening.deleteTransaction(undoId);
      removed = true;
      await onPersisted();
    } catch {
      if (!removed) {
        setUndoError("לא הצלחנו לבטל את הפעולה.");
        return;
      }
      setSaveError("הפעולה בוטלה, אבל הערב לא התרענן.");
    } finally {
      setUndoing(false);
    }
    setUndoId(null);
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet stack"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-toolbar">
          <header className="sheet-header">
            <h2 id="transaction-sheet-title">{editing === null ? "הוספת פעולה" : "עריכת פעולה"}</h2>
            <button type="button" className="button button-secondary" onClick={onClose}>
              סגירה
            </button>
          </header>
          {undoId !== null ? (
            <div className="notice stack" role="status">
              <p>הפעולה נשמרה.</p>
              <button type="button" className="button button-secondary" disabled={undoing} onClick={() => void undo()}>
                ביטול
              </button>
              {undoError !== null ? <p className="notice notice-alert">{undoError}</p> : null}
            </div>
          ) : null}
        </div>
        <div className="stack">
          <div className="stack">
            <PlayerPanel
              directory={directory}
              selectedId={draft.playerId}
              onSelect={(player) => {
                setDraft((current) => ({ ...current, playerId: player.id }));
                setErrors((current) => ({ ...current, player: undefined }));
                setSaveError(null);
              }}
            />
            {errors.player !== undefined ? (
              <p className="notice notice-alert" role="alert">
                {errors.player}
              </p>
            ) : null}
          </div>
          <fieldset className="stack type-field">
            <legend>סוג פעולה</legend>
            <div className="type-choices">
              {transactionTypeChoices.map((choice) => (
                <button
                  key={choice.type}
                  type="button"
                  className="choice"
                  aria-pressed={draft.type === choice.type}
                  onClick={() => {
                    setDraft((current) => ({ ...current, type: choice.type }));
                    setErrors((current) => ({ ...current, type: undefined }));
                    setSaveError(null);
                  }}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            {errors.type !== undefined ? (
              <p className="notice notice-alert" role="alert">
                {errors.type}
              </p>
            ) : null}
          </fieldset>
          <label className="stack field-label">
            <span>סכום</span>
            <input
              ref={amountRef}
              className="field amount-field"
              name="amount"
              dir="ltr"
              value={draft.amount}
              aria-invalid={errors.amount !== undefined}
              {...amountFieldProps}
              onChange={(event) => {
                setDraft((current) => ({ ...current, amount: event.target.value }));
                setErrors((current) => ({ ...current, amount: undefined }));
                setSaveError(null);
              }}
            />
          </label>
          {errors.amount !== undefined ? (
            <p className="notice notice-alert" role="alert">
              {errors.amount}
            </p>
          ) : null}
          {saveError !== null ? (
            <p className="notice notice-alert" role="alert">
              {saveError}
            </p>
          ) : null}
          <button type="button" className="button button-primary" disabled={saving} onClick={() => void save()}>
            שמירה
          </button>
        </div>
      </div>
    </div>
  );
}
