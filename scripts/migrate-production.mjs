import { spawnSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log("Skipping database migration outside Vercel production.");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required for production migrations.");
  process.exit(1);
}

console.log("Applying pending Drizzle migrations...");

const result = spawnSync("npx", ["drizzle-kit", "migrate"], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("Database migrations are up to date.");
