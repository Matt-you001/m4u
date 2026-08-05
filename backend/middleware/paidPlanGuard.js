import { pool } from "../db.js";

export const paidPlanGuard = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT plan FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(401).json({ error: "User not found" });
    }

    const plan = String(rows[0].plan || "free").toLowerCase();

    if (plan !== "basic" && plan !== "premium") {
      return res.status(403).json({
        error: "Greeting cards are available to paid subscribers only.",
        upgradeRequired: true,
      });
    }

    req.currentPlan = plan;
    next();
  } catch (error) {
    console.error("Paid plan guard error:", error);
    res.status(500).json({ error: "Unable to verify subscription access" });
  }
};
