import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getServerEnv } from "@/config/env";

const env = getServerEnv();
const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle({ client: pool });
