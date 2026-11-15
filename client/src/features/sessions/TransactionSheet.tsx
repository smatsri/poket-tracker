import { useEffect, useRef, useState } from "react";
import type { PlayerDirectory } from "../players/directory.ts";
import { PlayerPanel } from "../players/PlayerPanel.tsx";
import { useOperatorSettings } from "../settings/OperatorSettings.tsx";
import { createSingleFlight } from "../singleFlight.ts";
import type { Transaction } from "../../domain/models.ts";
import type { EveningService } from "./evening.ts";
import {
  amountFieldProps,
  createActionChoices,
  closesSheetAfterCreate,
  createDraftAfterSave,
  draftFromTransaction,
  editedTransaction,
  emptyCreateDraft,
  selectCreatePlayer,
  transactionTypeChoices,
  validateCreateDraft,
  validateTransactionDraft,
  type CreateDraft,
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
  const amountTouched = useRef(false);
  const flight = useRef(createSingleFlight());
  const { settings } = useOperatorSettings();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [draft, setDraft] = useState<CreateDraft | TransactionDraft>(() =>
    editing === null ? emptyCreateDraft(presetPlayerId, settings.defaultAmount) : draftFromTransaction(editing),
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

  useEffect(() => {
    let active = true;
    evening.readCurrent().then((record) => {
      if (active) {
        setTransactions(record?.session.transactions ?? []);
      }
    });
    return () => {
      active = false;
    };
  }, [evening]);

  useEffect(() => {
    if (editing !== null || amountTouched.current) {
      return;
    }
    const amount = String(settings.defaultAmount);
    setDraft((current) => (isCreateDraft(current) && current.amount !== amount ? { ...current, amount } : current));
  }, [editing, settings.defaultAmount]);

  async function save() {
    if (isCreateDraft(draft)) {
      const result = validateCreateDraft(draft, transactions);
      if (!result.ok) {
        setErrors(result.errors);
        setSaveError(null);
        return;
      }

      const creating = draft;
      const values = result.values;
      await flight.current(async () => {
        setSaving(true);
        setErrors({});
        setSaveError(null);
        let saved: Transaction[] = [];
        try {
          saved = await evening.addTransactions(values);
        } catch {
          setSaveError("לא הצלחנו לשמור את הפעולה.");
          return;
        } finally {
          setSaving(false);
        }

        let refreshed = false;
        try {
          await onPersisted();
          refreshed = true;
        } catch {
          setSaveError("הפעולה נשמרה, אבל הערב לא התרענן.");
        }

        if (closesSheetAfterCreate(saved.length) && refreshed) {
          onClose();
          return;
        }

        amountTouched.current = false;
        setDraft(createDraftAfterSave(creating, settings.defaultAmount));
        const current = await evening.readCurrent();
        setTransactions(current?.session.transactions ?? []);
        setUndoId(saved.length === 1 ? (saved[0]?.id ?? null) : null);
        setUndoError(null);
        setAmountFocus((focus) => focus + 1);
      });
      return;
    }

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
      if (editing === null) {
        setSaveError("לא הצלחנו לשמור את הפעולה.");
        setSaving(false);
        return;
      }

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
        <div className="sheet-scroll stack">
          <PlayerPanel
            directory={directory}
            selectedId={isCreateDraft(draft) ? null : draft.playerId}
            selectedIds={isCreateDraft(draft) ? draft.playerIds : undefined}
            multiple={isCreateDraft(draft) && draft.action === "add"}
            manage={false}
            eveningTransactions={editing === null ? transactions : undefined}
            onSelect={(player) => {
              setDraft((current) => (isCreateDraft(current) ? selectCreatePlayer(current, player.id) : { ...current, playerId: player.id }));
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
        <div className="sheet-actions stack">
          <fieldset className="stack type-field">
            <legend>{editing === null ? "פעולה" : "סוג פעולה"}</legend>
            <div className="type-choices">
              {isCreateDraft(draft)
                ? createActionChoices.map((choice) => (
                    <button
                      key={choice.action}
                      type="button"
                      className="choice"
                      aria-pressed={draft.action === choice.action}
                      onClick={() => {
                        setDraft((current) => (isCreateDraft(current) ? { ...current, action: choice.action } : current));
                        setErrors((current) => ({ ...current, type: undefined }));
                        setSaveError(null);
                      }}
                    >
                      {choice.label}
                    </button>
                  ))
                : transactionTypeChoices.map((choice) => (
                    <button
                      key={choice.type}
                      type="button"
                      className="choice"
                      aria-pressed={draft.type === choice.type}
                      onClick={() => {
                        setDraft((current) => (isCreateDraft(current) ? current : { ...current, type: choice.type }));
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
            <span>סכום ({settings.currencyLabel})</span>
            <input
              ref={amountRef}
              className="field amount-field"
              name="amount"
              dir="ltr"
              value={draft.amount}
              aria-invalid={errors.amount !== undefined}
              {...amountFieldProps}
              onChange={(event) => {
                amountTouched.current = true;
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

function isCreateDraft(draft: CreateDraft | TransactionDraft): draft is CreateDraft {
  return "action" in draft;
}
