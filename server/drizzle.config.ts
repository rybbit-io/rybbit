import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config();

export default defineConfig({
  schema: "./src/db/postgres/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "analytics",
    user: process.env.POSTGRES_USER || "frog",
    password: process.env.POSTGRES_PASSWORD || "frog",
    ssl:
      process.env.POSTGRES_SSL === "true"
        ? {
            rejectUnauthorized:
              process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED === "false"
                ? false
                : true,
            ca: process.env.POSTGRES_SSL_CA
              ? process.env.POSTGRES_SSL_CA.replace(/\\n/g, "\n")
              : undefined,
          }
        : false,
    onnotice: () => {},
    max: 20,
  },
  verbose: true,
  schemaFilter: ["public"],
  tablesFilter: ['!pg_*'],
});
