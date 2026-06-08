import pg from "pg";
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

export async function ensureAuthSchema() {
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS first_name text,
      ADD COLUMN IF NOT EXISTS last_name text,
      ADD COLUMN IF NOT EXISTS phone_number text,
      ADD COLUMN IF NOT EXISTS referral_code text,
      ADD COLUMN IF NOT EXISTS referred_by_user_id integer,
      ADD COLUMN IF NOT EXISTS referral_rewarded_at timestamptz,
      ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS email_verification_code_hash text,
      ADD COLUMN IF NOT EXISTS email_verification_expires timestamptz,
      ADD COLUMN IF NOT EXISTS email_verification_attempts integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS email_verification_last_sent_at timestamptz,
      ADD COLUMN IF NOT EXISTS password_reset_code_hash text,
      ADD COLUMN IF NOT EXISTS password_reset_expires timestamptz,
      ADD COLUMN IF NOT EXISTS password_reset_attempts integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS password_reset_last_sent_at timestamptz;
  `);

  await pool.query(`
    UPDATE users
    SET referral_code = CONCAT('M4U', id)
    WHERE referral_code IS NULL OR TRIM(referral_code) = '';
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_unique_idx
    ON users (referral_code)
    WHERE referral_code IS NOT NULL;
  `);
}
