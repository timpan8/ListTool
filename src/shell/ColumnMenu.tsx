import { useEffect, useRef, useState } from 'preact/hooks';
import { en } from '../i18n/en';

/** One entry of a column menu: something to do now, or a value to type first. */
export type MenuItem =
  | { id: string; label: string; run: () => void }
  | {
      id: string;
      label: string;
      input: { label: string; initial: string; submit: (value: string) => void };
    };

type InputItem = Extract<MenuItem, { input: unknown }>;

interface Props {
  /** The accessible name of the trigger: "Column menu for City". */
  label: string;
  items: MenuItem[];
}

/**
 * The ▾ beside a column name. A native button opens a list of menu items; an item that
 * needs a value turns the list into one field. Esc closes and puts the focus back on the
 * ▾, arrows move within the list, and a click anywhere else closes it. The list is fixed
 * to the viewport so the table's own scrolling never clips it.
 */
export function ColumnMenu({ label, items }: Props) {
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const [typing, setTyping] = useState<InputItem | null>(null);
  const [draft, setDraft] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const open = at !== null;

  function close(refocus: boolean): void {
    setAt(null);
    setTyping(null);
    if (refocus) trigger.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    if (typing === null) root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    else root.current?.querySelector<HTMLElement>('input')?.focus();
  }, [open, typing]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent): void {
      if (!(event.target instanceof Node) || root.current?.contains(event.target) !== true) {
        close(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function toggle(): void {
    if (open) {
      close(false);
      return;
    }
    const box = trigger.current?.getBoundingClientRect();
    if (box === undefined) return;
    setAt({ top: box.bottom, left: Math.max(0, Math.min(box.left, window.innerWidth - 260)) });
  }

  function choose(item: MenuItem): void {
    if ('input' in item) {
      setTyping(item);
      setDraft(item.input.initial);
      return;
    }
    close(true);
    item.run();
  }

  function onListKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const buttons = Array.from(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = buttons.findIndex((button) => button === document.activeElement);
    const next = buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length];
    next?.focus();
  }

  const position = at === null ? undefined : `top:${at.top}px;left:${at.left}px`;

  return (
    <div class="menu" ref={root}>
      <button
        ref={trigger}
        type="button"
        class="menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={toggle}
      >
        ▾
      </button>
      {!open ? null : typing !== null ? (
        <form
          class="menu__form"
          style={position}
          onSubmit={(event) => {
            event.preventDefault();
            const item = typing;
            close(true);
            item.input.submit(draft);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            close(true);
          }}
        >
          <label class="visually-hidden" for={`menu-input-${typing.id}`}>
            {typing.input.label}
          </label>
          <input
            id={`menu-input-${typing.id}`}
            type="text"
            value={draft}
            placeholder={typing.input.label}
            onInput={(event) => setDraft(event.currentTarget.value)}
          />
          <button type="submit" class="button button--primary">
            {en.menu.ok}
          </button>
        </form>
      ) : (
        <ul class="menu__list" role="menu" aria-label={label} style={position} onKeyDown={onListKey}>
          {items.map((item) => (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                class="menu__item"
                onClick={() => choose(item)}
              >
                {'input' in item ? `${item.label}…` : item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
