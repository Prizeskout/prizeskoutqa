import { AsyncLocalStorage } from "node:async_hooks";

export type WaitUntilFn = (promise: Promise<unknown>) => void;

export const cfCtxStorage = new AsyncLocalStorage<WaitUntilFn>();

export function backgroundTask(promise: Promise<unknown>): void {
  const waitUntil = cfCtxStorage.getStore();
  if (waitUntil) {
    waitUntil(promise);
  } else {
    promise.catch((e) => console.error("[backgroundTask]", e));
  }
}
