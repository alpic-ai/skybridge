import "react";

declare module "react" {
  interface HTMLAttributes<T> {
    "data-llm"?: string;
  }
}

/** Shorthand for an arbitrary plain object — `Record<string, unknown>`. */
export type UnknownObject = Record<string, unknown>;

/** Flatten an intersection so it appears as a single object type in hovers and error messages. */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};
/** Widen `T` to also satisfy {@link UnknownObject}, useful for tool input/output narrowing. */
export type Objectify<T> = T & UnknownObject;

type RequiredKeys<T> = {
  [K in keyof T]-?: Record<string, never> extends Pick<T, K> ? never : K;
}[keyof T];
/** `true` if `T` has at least one required key, `false` if every key is optional. */
export type HasRequiredKeys<T> = RequiredKeys<T> extends never ? false : true;
