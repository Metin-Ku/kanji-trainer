import { en } from "./en";

/** Same shape as `en`, but string values may differ per locale. */
type WidenStrings<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly WidenStrings<U>[]
    : T extends object
      ? { [K in keyof T]: WidenStrings<T[K]> }
      : T;

export type Messages = WidenStrings<typeof en>;

export { en };
