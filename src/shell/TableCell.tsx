import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  value: string;
  label: string;
  selected: boolean;
  onCommit: (value: string) => void;
}

/**
 * A cell that becomes a text field when it is clicked. Enter saves, Escape puts the old
 * value back — the same two keys as everywhere else in the app.
 *
 * Closing the field also blurs it, and a blur is itself a save. So one edit is finished
 * exactly once: the flag below is what stops Enter from saving twice and Escape from
 * being overtaken by the blur it causes.
 */
export function TableCell({ value, label, selected, onCommit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const open = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) input.current?.focus();
  }, [editing]);

  function start(): void {
    setDraft(value);
    open.current = true;
    setEditing(true);
  }

  function finish(save: boolean): void {
    if (!open.current) return;
    open.current = false;
    setEditing(false);
    if (save && draft !== value) onCommit(draft);
  }

  if (!editing) {
    return (
      <td class={selected ? 'is-selected' : undefined}>
        <button type="button" class="cell" aria-label={label} onClick={start}>
          {value === '' ? ' ' : value}
        </button>
      </td>
    );
  }

  return (
    <td class={selected ? 'is-selected' : undefined}>
      <input
        ref={input}
        class="cell__input"
        type="text"
        aria-label={label}
        value={draft}
        onInput={(event) => setDraft(event.currentTarget.value)}
        onBlur={() => finish(true)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          finish(event.key === 'Enter');
        }}
      />
    </td>
  );
}
