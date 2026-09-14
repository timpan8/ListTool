/** Save text as a file from memory. No server is involved at any point. */
export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Turn a list name into something safe to use as a filename. */
export function filenameFor(name: string, extension: string): string {
  const base = name.trim().replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '');
  return `${base === '' ? 'list' : base}.${extension}`;
}
