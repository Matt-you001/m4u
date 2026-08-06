import { pool } from "../db.js";
import { refreshCreditsIfDue } from "./planCredits.js";

export async function reserveCredits(userId, amount) {
  await refreshCreditsIfDue(userId);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT credits, extra_credits
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId]
    );

    if (!rows.length) {
      await client.query("ROLLBACK");
      return { status: "missing" };
    }

    const planCredits = Math.max(0, Number(rows[0].credits) || 0);
    const extraCredits = Math.max(0, Number(rows[0].extra_credits) || 0);

    if (planCredits + extraCredits < amount) {
      await client.query("ROLLBACK");
      return { status: "insufficient" };
    }

    const planCreditsUsed = Math.min(planCredits, amount);
    const extraCreditsUsed = amount - planCreditsUsed;
    const nextPlanCredits = planCredits - planCreditsUsed;
    const nextExtraCredits = extraCredits - extraCreditsUsed;

    await client.query(
      `UPDATE users
       SET credits = $1, extra_credits = $2
       WHERE id = $3`,
      [nextPlanCredits, nextExtraCredits, userId]
    );
    await client.query("COMMIT");

    return {
      status: "reserved",
      planCreditsUsed,
      extraCreditsUsed,
      remainingCredits: nextPlanCredits + nextExtraCredits,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function refundReservedCredits(userId, reservation) {
  if (!reservation || reservation.status !== "reserved") return;

  await pool.query(
    `UPDATE users
     SET credits = credits + $1,
         extra_credits = extra_credits + $2
     WHERE id = $3`,
    [reservation.planCreditsUsed, reservation.extraCreditsUsed, userId]
  );
}
