import { pool } from "../db.js";

export async function consumeCredit(userId) {
  if (process.env.DISABLE_CREDITS === "true") {
    return { remainingCredits: 999999 };
  }

  const { rows } = await pool.query(
    `SELECT credits, extra_credits FROM users WHERE id = $1`,
    [userId]
  );

  if (!rows.length) {
    const err = new Error("User not found");
    err.statusCode = 401;
    throw err;
  }

  let { credits, extra_credits } = rows[0];
  const totalCredits = credits + extra_credits;

  if (totalCredits <= 0) {
    const err = new Error("Out of credits");
    err.statusCode = 402;
    throw err;
  }

  if (credits > 0) {
    credits -= 1;
  } else {
    extra_credits -= 1;
  }

  await pool.query(
    `UPDATE users SET credits = $1, extra_credits = $2 WHERE id = $3`,
    [credits, extra_credits, userId]
  );

  return { remainingCredits: credits + extra_credits };
}

export const creditGuard = async (req, res, next) => {
  try {
    if (process.env.DISABLE_CREDITS === "true") {
      req.currentPlan = req.user.plan || "free";
      req.remainingCredits = 999999;
      return next();
    }

    const userId = req.user.id;

    const { rows } = await pool.query(
      `SELECT plan, credits, extra_credits FROM users WHERE id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const { plan, credits, extra_credits } = rows[0];
    const totalCredits = credits + extra_credits;

    if (totalCredits <= 0) {
      return res.status(402).json({
        error: "Out of credits",
        upgradeRequired: true,
      });
    }

    req.currentPlan = plan || req.user.plan || "free";
    req.remainingCredits = totalCredits;

    next();
  } catch (err) {
    console.error("Credit guard error:", err);
    res.status(500).json({ error: "Credit system failure" });
  }
};
