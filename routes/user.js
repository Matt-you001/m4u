import express from "express";
import { pool } from "../db.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /user/upgrade
 * Body: { plan: "basic" | "premium" }
 */
router.post("/upgrade", authenticateUser, async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;

    const PLANS = {
      free: 15,
      basic: 50,
      premium: 100,
    };

    if (!PLANS[plan]) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    await pool.query(
      `
      UPDATE users
      SET
        plan = $1,
        credits = $2,
        extra_credits = 0,
        last_credit_reset = NOW()
      WHERE id = $3
      `,
      [plan, PLANS[plan], userId]
    );

    res.json({
      success: true,
      plan,
      credits: PLANS[plan],
    });
  } catch (err) {
    console.error("Plan upgrade error:", err);
    res.status(500).json({ error: "Unable to upgrade plan" });
  }
});

router.get('/user/me', authenticateUser, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT 
        id,
        email,
        plan,
        credits,
        extra_credits
      FROM users
      WHERE id = $1
      `,
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];

    res.json({
      id: user.id,
      email: user.email,
      plan: user.plan,
      credits: user.credits,
      extraCredits: user.extra_credits,
      totalCredits: user.credits + user.extra_credits,
    });
  } catch (err) {
    console.error('ME endpoint error:', err);
    res.status(500).json({ error: 'Failed to load user' });
  }
});

export default router;
