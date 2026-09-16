import { useEffect, useRef, useState } from 'preact/hooks';

/** How long typing may pause before the preview catches up. */
export const SETTLE_MS = 150;

interface Props {
  id: string;
  type: 'text' | 'number';
  value: string;
  onChange: (value: string) => void;
}

/**
 * A text box that keeps what is typed to itself for a moment. Every keystroke used to
 * re-run the tool over the whole list; now the list runs once the typing pauses, and at
 * once when the box is left or Enter is pressed — so Apply never sees a stale value.
 */
export function DebouncedInput({ id, type, value, onChange }: Props) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(value);

  // A value that changed underneath — a tool reopened, a finding — wins over the draft.
  useEffect(() => {
    if (value !== latest.current) {
      latest.current = value;
      setDraft(value);
    }
  }, [value]);

  function commit(next: string): void {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
    if (next === latest.current) return;
    latest.current = next;
    onChange(next);
  }

  function type_(next: string): void {
    setDraft(next);
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next), SETTLE_MS);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <input
      id={id}
      type={type}
      value={draft}
      onInput={(event) => type_(event.currentTarget.value)}
      onBlur={() => commit(draft)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit(draft);
      }}
    />
  );
}
