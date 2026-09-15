import { useLayoutEffect, useRef, useState } from 'preact/hooks';

interface Props {
  value: string;
  label: string;
  /** Classes the cell carries for its column: selected, numeric. */
  className?: string | undefined;
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
export function TableCell({ value, label, className, onCommit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const open = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // Before the paint, so the caret is there the moment the field is, keystrokes included.
  useLayoutEffect(() => {
    if (editing) input.current?.focus();
  }, [editing]);

  function start(): void {
    setDraft(value);
    open.current = true;
    setEditing(true);
  }

  function finish(save: boolean, refocus: boolean): void {
    if (!open.current) return;
    open.current = false;
    setEditing(false);
    if (save && draft !== value) onCommit(draft);
    // A keyboard edit ends where it began, so the arrows can carry on from this cell.
    if (refocus) setTimeout(() => button.current?.focus(), 0);
  }

  if (!editing) {
    return (
      <td class={className}>
        <button ref={button} type="button" class="cell" aria-label={label} onClick={start}>
          {value === '' ? ' ' : value}
        </button>
      </td>
    );
  }

  return (
    <td class={className}>
      <input
        ref={input}
        class="cell__input"
        type="text"
        aria-label={label}
        value={draft}
        onInput={(event) => setDraft(event.currentTarget.value)}
        onBlur={() => finish(true, false)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          finish(event.key === 'Enter', true);
        }}
      />
    </td>
  );
}
