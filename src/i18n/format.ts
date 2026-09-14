/** Fill `{name}` placeholders in a template from `i18n/en.ts`. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

export interface PluralForms {
  one: string;
  other: string;
}

/** Pick a plural form and fill its `{n}`. English rules; a translation can widen this. */
export function plural(count: number, forms: PluralForms): string {
  return format(count === 1 ? forms.one : forms.other, { n: count });
}
