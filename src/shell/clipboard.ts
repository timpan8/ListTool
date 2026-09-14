/**
 * Clipboard access is local browser I/O — nothing leaves the page. Returns false when
 * the browser refuses (no permission, or an insecure context) so the caller can say so
 * instead of failing silently.
 *
 * When the exporter can also render HTML, both flavours go on the clipboard at once:
 * the receiving app picks. Excel and Word take the table; a text editor takes the text.
 */
export async function copyText(text: string, html?: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || navigator.clipboard === undefined) return false;

  if (html !== undefined && typeof ClipboardItem !== 'undefined') {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ]);
      return true;
    } catch {
      // Firefox before 127 and any browser that refuses `write` still gets the text.
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** The HTML a paste carries, when it carries any. */
export function htmlFromPaste(data: DataTransfer | null): string {
  return data?.getData('text/html') ?? '';
}
