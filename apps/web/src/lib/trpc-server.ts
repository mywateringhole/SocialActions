import { appRouter, type Context } from "@socialactions/api";
import { createDb } from "@socialactions/db";

let db: ReturnType<typeof createDb> | null = null;

function getDb() {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required");
    db = createDb(url);
  }
  return db;
}

export function createContext(): Context {
  return { db: getDb() };
}

/** Lazy caller - only creates DB connection when actually called */
export const caller = new Proxy({} as ReturnType<typeof appRouter.createCaller>, {
  get(_target, prop) {
    const realCaller = appRouter.createCaller(createContext());
    return (realCaller as Record<string | symbol, unknown>)[prop];
  },
});
