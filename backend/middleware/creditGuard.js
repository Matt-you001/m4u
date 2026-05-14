import { pool } from "../db.js";

export const creditGuard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query(
      `SELECT plan, credits, extra_credits FROM users WHERE id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    let { plan, credits, extra_credits } = rows[0];
    const totalCredits = credits + extra_credits;

    if (totalCredits <= 0) {
      return res.status(402).json({
        error: "Out of credits",
        upgradeRequired: true,
      });
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

    req.currentPlan = plan || req.user.plan || "free";
    req.remainingCredits = credits + extra_credits;

    next();
  } catch (err) {
    console.error("Credit guard error:", err);
    res.status(500).json({ error: "Credit system failure" });
  }
};
