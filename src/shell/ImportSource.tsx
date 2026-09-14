import { useRef, useState } from 'preact/hooks';
import { en } from '../i18n/en';

interface Props {
  text: string;
  onText: (text: string) => void;
}

/**
 * Where the text comes from: paste, a file, or a dropped file. Drag and drop is never
 * the only way in — the file button is always there.
 */
export function ImportSource({ text, onText }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  async function readFile(file: File | undefined): Promise<void> {
    if (file === undefined) return;
    try {
      onText(await file.text());
      setError('');
    } catch {
      setError(en.import.fileFailed);
    }
  }

  return (
    <div
      class={dragging ? 'source is-dragging' : 'source'}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void readFile(event.dataTransfer?.files[0]);
      }}
    >
      <label class="field">
        <span class="field__label">{en.import.pasteLabel}</span>
        <textarea
          id="import-text"
          class="source__text"
          rows={6}
          placeholder={en.import.pastePlaceholder}
          value={text}
          onInput={(event) => onText(event.currentTarget.value)}
        />
      </label>

      <div class="source__file">
        <button type="button" class="button" onClick={() => fileInput.current?.click()}>
          {en.import.file}
        </button>
        <span class="field__help">{en.import.fileHint}</span>
        <input
          ref={fileInput}
          type="file"
          class="visually-hidden"
          accept=".txt,.csv,.tsv,text/plain,text/csv"
          onChange={(event) => {
            void readFile(event.currentTarget.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
      </div>

      {error === '' ? null : (
        <p class="notice notice--error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
