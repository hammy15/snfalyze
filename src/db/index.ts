import "server-only";
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Lazy initialization — prevents Neon DB call at module import (build-time safe)
let _instance: ReturnType<typeof drizzle<typeof schema>> | null = null;

const getInstance = (): ReturnType<typeof drizzle<typeof schema>> => {
  if (!_instance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _instance = drizzle(neon(connectionString), { schema });
  }
  return _instance;
};

// Proxy so all property accesses go through getInstance() at runtime only
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return Reflect.get(getInstance(), prop);
  },
}) as ReturnType<typeof drizzle<typeof schema>>;

export * from './schema';
