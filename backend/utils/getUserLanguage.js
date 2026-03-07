import { pool } from "../db.js";

export async function getUserPreferredLanguage(userId) {
  const result = await pool.query(
    "SELECT preferred_language FROM users WHERE id = $1",
    [userId]
  );

  return result.rows[0]?.preferred_language || "English";
}
