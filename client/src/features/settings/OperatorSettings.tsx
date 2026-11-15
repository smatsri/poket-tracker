import { createContext, useContext, useEffect, useState } from "react";
import type { LocalRepository } from "../../data/local/repository.ts";
import { initialOperatorSettings, parseOperatorSettings, type OperatorSettings } from "../../data/local/operatorSettings.ts";
import { parsePositiveInteger } from "../sessions/transactionForm.ts";

interface OperatorSettingsValue {
  settings: OperatorSettings;
  save: (settings: OperatorSettings) => Promise<void>;
}

const OperatorSettingsContext = createContext<OperatorSettingsValue>({
  settings: initialOperatorSettings,
  save: async () => undefined,
});

export function OperatorSettingsProvider({
  repository,
  children,
}: {
  repository: LocalRepository;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState(initialOperatorSettings);

  useEffect(() => {
    let active = true;
    repository.readOperatorSettings().then((stored) => {
      if (active) {
        setSettings(stored);
      }
    });
    return () => {
      active = false;
    };
  }, [repository]);

  async function save(next: OperatorSettings) {
    await repository.saveOperatorSettings(next);
    setSettings(next);
  }

  return <OperatorSettingsContext.Provider value={{ settings, save }}>{children}</OperatorSettingsContext.Provider>;
}

export function useOperatorSettings(): OperatorSettingsValue {
  return useContext(OperatorSettingsContext);
}

export function OperatorSettingsForm() {
  const { settings, save } = useOperatorSettings();
  const [amount, setAmount] = useState(String(settings.defaultAmount));
  const [label, setLabel] = useState(settings.currencyLabel);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAmount(String(settings.defaultAmount));
    setLabel(settings.currencyLabel);
  }, [settings]);

  async function submit() {
    const defaultAmount = parsePositiveInteger(amount);
    const currencyLabel = label.trim();
    const next = parseOperatorSettings({ defaultAmount, currencyLabel });
    if (next === null) {
      setError("סכום ברירת המחדל צריך להיות מספר שלם וחיובי, והסימון צריך להיות קצר.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await save(next);
    } catch {
      setError("לא הצלחנו לשמור את ההגדרות.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="card stack"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h2>הגדרות</h2>
      <label className="stack field-label">
        <span>סכום ברירת מחדל</span>
        <input
          className="field"
          name="default-amount"
          inputMode="numeric"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setError(null);
          }}
        />
      </label>
      <label className="stack field-label">
        <span>סימון מטבע</span>
        <input
          className="field"
          name="currency-label"
          value={label}
          maxLength={12}
          onChange={(event) => {
            setLabel(event.target.value);
            setError(null);
          }}
        />
      </label>
      {error !== null ? (
        <p className="notice notice-alert" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="button button-secondary" disabled={saving}>
        שמירת הגדרות
      </button>
    </form>
  );
}
