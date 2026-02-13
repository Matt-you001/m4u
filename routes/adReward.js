import express from "express";
import pool from "../db.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /ads/reward
 * Free users watch an ad → +1 credit
 */
router.post("/reward", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query(
      "SELECT plan FROM users WHERE id = $1",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    if (rows[0].plan !== "free") {
      return res
        .status(403)
        .json({ error: "Only free users can earn ad credits" });
    }

    await pool.query(
      `
      UPDATE users
      SET extra_credits = extra_credits + 1
      WHERE id = $1
      `,
      [userId]
    );

    res.json({ success: true, added: 1 });
  } catch (err) {
    console.error("Ad reward error:", err);
    res.status(500).json({ error: "Failed to add ad credit" });
  }
});

export default router;
