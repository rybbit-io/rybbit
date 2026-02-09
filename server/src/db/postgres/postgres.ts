import cluster from "node:cluster";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

dotenv.config();

// Scale connection pool based on clustering mode.
// Primary only needs a small pool for cron DB operations.
// Workers split the remaining budget to keep total under PostgreSQL's default 100 limit.
const workerCount = parseInt(process.env.CLUSTER_WORKERS || "0", 10);
const maxConnections = cluster.isWorker
  ? Math.max(5, Math.floor(20 / (workerCount || 1)))
  : cluster.isPrimary && workerCount > 0
    ? 5
    : 20;

// Create postgres connection
const client = postgres({
  host: process.env.POSTGRES_HOST || "postgres",
  port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
  database: process.env.POSTGRES_DB,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  onnotice: () => {},
  max: maxConnections,
});

// Create drizzle ORM instance
export const db = drizzle(client, { schema });

// For compatibility with raw SQL if needed
export const sql = client;
