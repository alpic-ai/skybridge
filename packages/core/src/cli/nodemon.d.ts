import type { EventEmitter } from "node:stream";

export type ExtendedNodemon = import("nodemon").default & {
  stdout?: EventEmitter;
  stderr?: EventEmitter;
  on(
    event: "restart",
    listener: (files: string[]) => void,
  ): import("nodemon").Nodemon;
};
