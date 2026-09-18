import { pool } from "../db.js";

export const PLAN_CREDITS = Object.freeze({
  free: 10,
  basic: 40,
  premium: 80,
});

export function getPlanCredits(plan) {
  return PLAN_CREDITS[String(plan || "free").toLowerCase()] ?? PLAN_CREDITS.free;
}

export async function expireSubscriptionIfDue(userId, database = pool) {
  const { rows } = await database.query(
    `
    UPDATE users
    SET
      plan = 'free',
      credits = $1::integer,
      extra_credits = 0,
      last_credit_reset = NOW(),
      subscription_last_synced_at = NOW()
    WHERE id = $2
      AND plan IN ('basic', 'premium')
      AND subscription_expires_at IS NOT NULL
      AND subscription_expires_at <= NOW()
    RETURNING id, plan, credits, subscription_expires_at
    `,
    [PLAN_CREDITS.free, userId]
  );

  return rows[0] || null;
}

export async function expireAllSubscriptionsIfDue(database = pool) {
  const { rows } = await database.query(
    `
    UPDATE users
    SET
      plan = 'free',
      credits = $1::integer,
      extra_credits = 0,
      last_credit_reset = NOW(),
      subscription_last_synced_at = NOW()
    WHERE plan IN ('basic', 'premium')
      AND subscription_expires_at IS NOT NULL
      AND subscription_expires_at <= NOW()
    RETURNING id
    `,
    [PLAN_CREDITS.free]
  );

  return rows.length;
}

export async function refreshCreditsIfDue(userId, database = pool) {
  await expireSubscriptionIfDue(userId, database);

  const { rows } = await database.query(
    `
    UPDATE users
    SET
      credits = CASE plan
        WHEN 'basic' THEN $2::integer
        WHEN 'premium' THEN $3::integer
        ELSE $1::integer
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
  const expiredSubscriptions = await expireAllSubscriptionsIfDue(database);
  if (expiredSubscriptions > 0) {
    console.log(
      `Expired ${expiredSubscriptions} stale paid subscription${expiredSubscriptions === 1 ? "" : "s"}`
    );
  }

  const { rows } = await database.query(
    `
    UPDATE users
    SET
      credits = CASE plan
        WHEN 'basic' THEN $2::integer
        WHEN 'premium' THEN $3::integer
        ELSE $1::integer
      END,
      last_credit_reset = NOW()
    WHERE last_credit_reset <= NOW() - INTERVAL '1 month'
    RETURNING id
    `,
    [PLAN_CREDITS.free, PLAN_CREDITS.basic, PLAN_CREDITS.premium]
  );

  return rows.length;
}