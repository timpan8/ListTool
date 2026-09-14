/**
 * Clipboard access is local browser I/O — nothing leaves the page. Returns false when
 * the browser refuses (no permission, or an insecure context) so the caller can say so
 * instead of failing silently.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || navigator.clipboard === undefined) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
