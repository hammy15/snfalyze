import "server-only";
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Use a placeholder during build time if DATABASE_URL is not set
// The actual connection is only used at runtime when queries are made
const connectionString = process.env.DATABASE_URL ?? 'postgresql://build-placeholder:placeholder@localhost/placeholder';
const sql = neon(connectionString);

// Create the drizzle database instance
export const db = drizzle(sql, { schema });

// Export schema for use in queries
export * from './schema';
