import { Pool } from "pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const isRemoteDb = process.env.POSTGRES_HOST?.includes("neon.tech");

export const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  user: process.env.POSTGRES_USER,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
});

export async function insertClicks(
  events: { shortCode: string; timestamp: number }[],
): Promise<void> {
  if (events.length === 0) {
    return;
  }

  const values: any[] = [];
  const placeholders = events
    .map((e, i) => {
      values.push(e.shortCode, new Date(Number(e.timestamp)));
      return `($${i * 2 + 1}, $${i * 2 + 2})`;
    })
    .join(", ");

  await pool.query(
    `INSERT INTO clicks (short_code, clicked_at) VALUES ${placeholders}`,
    values,
  );
}
