/**
 * Every user-facing string in the app. Components never contain literal UI text —
 * that is what makes a Swedish UI a translation file later instead of a rewrite.
 */
export const en = {
  app: {
    name: 'List Tool',
    tagline: 'Paste, clean, compare and export lists.',
    privacy: 'Your lists never leave your browser.',
  },
  placeholder: {
    heading: 'Under construction',
    body:
      'The workspace is not built yet. Import, tools, compare mode and export arrive ' +
      'in the next milestones.',
  },
} as const;
