import { pool } from "../db.js";

export const PLAN_CREDITS = Object.freeze({
  free: 10,
  basic: 40,
  premium: 80,
});

export function getPlanCredits(plan) {
  return PLAN_CREDITS[String(plan || "free").toLowerCase()] ?? PLAN_CREDITS.free;
}

export async function refreshCreditsIfDue(userId, database = pool) {
  const { rows } = await database.query(
    `
    UPDATE users
    SET
      credits = CASE plan
        WHEN 'basic' THEN $2
        WHEN 'premium' THEN $3
        ELSE $1
      END,
      last_credit_reset = NOW()
    WHERE id = $4
      AND last_credit_reset <= NOW() - INTERVAL '1 month'
    RETURNING plan, credits, extra_credits, last_credit_reset
    `,
    [PLAN_CREDITS.free, PLAN_CREDITS.basic, PLAN_CREDITS.premium, userId]
  );

  return rows[0] || null;
}

export async function refreshAllDueCredits(database = pool) {
  const { rows } = await database.query(
    `
    UPDATE users
    SET
      credits = CASE plan
        WHEN 'basic' THEN $2
        WHEN 'premium' THEN $3
        ELSE $1
      END,
      last_credit_reset = NOW()
    WHERE last_credit_reset <= NOW() - INTERVAL '1 month'
    RETURNING id
    `,
    [PLAN_CREDITS.free, PLAN_CREDITS.basic, PLAN_CREDITS.premium]
  );

  return rows.length;
}
