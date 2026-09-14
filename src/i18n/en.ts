/**
 * Every user-facing string in the app, including the names, descriptions and option
 * labels of parsers, tools and exporters. Components never contain literal UI text —
 * that is what makes a Swedish UI a translation file later instead of a rewrite.
 *
 * `{n}`-style placeholders are filled by `format` / `plural` in ./format.
 */
export const en = {
  app: {
    name: 'List Tool',
    tagline: 'Paste, clean, compare and export lists.',
    privacy: 'Your lists never leave your browser.',
  },

  toolbar: {
    import: 'Import',
    undo: 'Undo',
    redo: 'Redo',
    copy: 'Copy',
    export: 'Export',
    undoHint: 'Ctrl/Cmd+Z',
    redoHint: 'Shift+Ctrl/Cmd+Z',
    copied: 'Copied to clipboard',
    copyFailed: 'Could not copy. Select the text and copy it manually.',
  },

  tabs: {
    label: 'Lists',
    add: 'New list',
    addHint: 'Import a list',
    rename: 'Rename',
    renamePrompt: 'Name for this list',
    duplicate: 'Duplicate',
    close: 'Close',
    closeNamed: 'Close {name}',
    goTo: 'Go to list',
    untitled: 'List {n}',
    copySuffix: '{name} (copy)',
  },

  view: {
    raw: 'Raw',
    table: 'Table',
    modeLabel: 'View',
    search: 'Search in view…',
    searchLabel: 'Search in view',
    searchHint: 'Filters what is shown. It never changes the list.',
    reparse: 'Re-parse…',
    rawLabel: 'Original input',
    rawMissing: 'This list has no original input to show.',
    noMatches: 'No rows match {query}.',
    showing: 'Showing {shown} of {total} rows',
    rowNumber: '#',
  },

  status: {
    rows: { one: '{n} row', other: '{n} rows' },
    unique: '{n} unique',
    blank: '{n} blank',
    duplicates: '{n} duplicates',
    separator: ' · ',
    countedOn: 'counted on {column}',
    wholeRow: 'the whole row',
  },

  empty: {
    title: 'Paste a list to start',
    body: 'Anything goes: one item per line, a comma-separated line, a copied table, or a CSV file. You choose how it is read before anything is imported.',
    exampleLabel: 'For example',
    example: 'data1, data2, data3',
    exampleResult: 'becomes three rows you can clean, compare and copy back out.',
    action: 'Import a list',
    pasteHint: 'You can also just press Ctrl/Cmd+V.',
  },

  import: {
    title: 'Import',
    reparseTitle: 'Re-parse',
    pasteLabel: 'Paste or type your list',
    pastePlaceholder: 'Paste here…',
    file: 'Choose a file…',
    fileHint: 'Reads .txt, .csv and .tsv from your computer. The file is never uploaded.',
    fileFailed: 'Could not read that file.',
    drop: 'Drop a file here',
    parser: 'Read as',
    detected: 'Detected: {parser} · {rows} · {columns}',
    detectedNothing: 'Nothing detected yet — paste something above.',
    preview: 'Preview',
    previewNote: 'First {n} rows',
    previewEmpty: 'Nothing to preview yet.',
    nameLabel: 'List name',
    submit: 'Import',
    resubmit: 'Re-parse',
    cancel: 'Cancel',
    columns: { one: '{n} column', other: '{n} columns' },
  },

  export: {
    title: 'Export',
    format: 'Format',
    preview: 'Preview',
    previewNote: 'First {n} lines',
    copy: 'Copy',
    download: 'Download',
    close: 'Close',
    empty: 'This list is empty, so there is nothing to export.',
  },

  options: {
    custom: 'Custom',
    customDelimiter: 'Custom delimiter',
    customDelimiterHint: 'Type \\t for tab and \\n for newline.',
    delimiters: {
      newline: 'Newline',
      comma: 'Comma ,',
      semicolon: 'Semicolon ;',
      tab: 'Tab',
      pipe: 'Pipe |',
      space: 'Space',
    },
  },

  columns: {
    value: 'Value',
    numbered: 'Column {n}',
  },

  parsers: {
    lines: {
      name: 'Lines',
      description: 'One item per line.',
      trim: 'Trim items',
      dropEmpty: 'Drop empty items',
    },
    delimited: {
      name: 'Delimited',
      description: 'Split on a delimiter — one line or many.',
      delimiter: 'Delimiter',
      trim: 'Trim items',
      dropEmpty: 'Drop empty items',
      splitIntoColumns: 'Split into columns instead of rows',
      splitHelp: 'Off: every item becomes a row. On: every line becomes a row of columns.',
    },
    csv: {
      name: 'CSV / TSV',
      description: 'Tabular data with quotes and embedded newlines.',
      delimiter: 'Delimiter',
      auto: 'Detect automatically',
      header: 'First row is a header',
    },
  },

  exporters: {
    lines: { name: 'Lines', column: 'Column' },
    joinedLine: { name: 'Joined line', column: 'Column', delimiter: 'Delimiter' },
    quoted: {
      name: 'Quoted list',
      column: 'Column',
      quote: 'Quote character',
      separator: 'Separator',
      help: 'For SQL IN lists and PowerShell arrays.',
    },
    csv: { name: 'CSV', header: 'Include header row' },
    tsv: { name: 'TSV', header: 'Include header row' },
  },

  steps: {
    parse: 'Read as {parser} · {rows}',
  },

  a11y: {
    skipToContent: 'Skip to content',
    dialogClose: 'Close dialog',
    activeList: 'Active list',
  },
} as const;
