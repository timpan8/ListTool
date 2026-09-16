import type { en } from './en';

/**
 * The shape of the English strings with every leaf widened to `string`: what a
 * translation must fill, key for key. A missing or extra key fails to compile, so the
 * two languages cannot drift apart without the build saying so.
 */
export type Widen<T> = T extends string ? string : { readonly [K in keyof T]: Widen<T[K]> };

export type Strings = Widen<typeof en>;
