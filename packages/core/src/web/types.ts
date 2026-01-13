import "react";

declare module "react" {
  // biome-ignore lint/correctness/noUnusedVariables: HTMLAttributes must have the same signature and requires a type parameter
  interface HTMLAttributes<T> {
    "data-llm"?: string;
  }
}

export type UnknownObject = Record<string, unknown>;

export type Prettify<T> = { [K in keyof T]: T[K] } & {};
export type Objectify<T> = T & UnknownObject;

type RequiredKeys<T> = {
  [K in keyof T]-?: Record<string, never> extends Pick<T, K> ? never : K;
}[keyof T];
export type HasRequiredKeys<T> = RequiredKeys<T> extends never ? false : true;
