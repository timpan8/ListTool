import { useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { en } from '../i18n/en';

interface Props {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
}

/**
 * A native modal dialog: the browser traps focus inside it and Esc closes it. Focus is
 * returned to whatever opened the dialog when it goes away.
 */
export function Dialog({ title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = ref.current;
    const opener = document.activeElement;
    if (element !== null && !element.open) element.showModal();

    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      class="dialog"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div class="dialog__head">
        <h2 class="dialog__title">{title}</h2>
        <button
          type="button"
          class="button button--quiet"
          onClick={onClose}
          aria-label={en.a11y.dialogClose}
        >
          ✕
        </button>
      </div>
      <div class="dialog__body">{children}</div>
    </dialog>
  );
}
