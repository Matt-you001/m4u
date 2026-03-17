import bcrypt from "bcrypt";
import express from "express";
import { pool } from "../db.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

const PLAN_LIMITS = {
  free: 15,
  basic: 50,
  premium: 100,
};

/**
 * POST /user/upgrade
 * Body: { plan: "basic" | "premium" }
 */
router.post("/upgrade", authenticateUser, async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;

    if (!PLAN_LIMITS[plan]) {
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
      [plan, PLAN_LIMITS[plan], userId]
    );

    res.json({
      success: true,
      plan,
      credits: PLAN_LIMITS[plan],
    });
  } catch (err) {
    console.error("Plan upgrade error:", err);
    res.status(500).json({ error: "Unable to upgrade plan" });
  }
});

/**
 * GET /user/me
 */
router.get("/me", authenticateUser, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        first_name,
        last_name,
        phone_number,
        email,
        plan,
        credits,
        extra_credits
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    const baseCredits = PLAN_LIMITS[user.plan] || 15;
    const usedCredits = Math.max(baseCredits - user.credits, 0);

    res.json({
      id: user.id,
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      phoneNumber: user.phone_number || "",
      email: user.email,
      plan: user.plan,
      credits: user.credits,
      extraCredits: user.extra_credits,
      totalCredits: user.credits + user.extra_credits,
      baseCredits,
      usedCredits,
    });
  } catch (err) {
    console.error("ME endpoint error:", err);
    res.status(500).json({ error: "Failed to load user" });
  }
});

/**
 * PATCH /user/profile
 * Body: { firstName, lastName}
 */
router.patch("/profile", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName } = req.body;

    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({
        message: "First name and last name are required",
      });
    }

    const { rows } = await pool.query(
      `
      UPDATE users
      SET
        first_name = $1,
        last_name = $2
      WHERE id = $3
      RETURNING
        id,
        first_name,
        last_name,
        phone_number,
        email,
        plan,
        credits,
        extra_credits
      `,
      [firstName.trim(), lastName.trim(), userId]
    );

    const user = rows[0];
    const baseCredits = PLAN_LIMITS[user.plan] || 15;
    const usedCredits = Math.max(baseCredits - user.credits, 0);

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user.id,
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        phoneNumber: user.phone_number || "",
        email: user.email,
        plan: user.plan,
        credits: user.credits,
        extraCredits: user.extra_credits,
        totalCredits: user.credits + user.extra_credits,
        baseCredits,
        usedCredits,
      },
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

/**
 * POST /user/change-password
 * Body: { currentPassword, newPassword }
 */
router.post("/change-password", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    const strongPassword =
      newPassword.length >= 8 &&
      /[A-Z]/.test(newPassword) &&
      /[a-z]/.test(newPassword) &&
      /[0-9]/.test(newPassword) &&
      /[^A-Za-z0-9]/.test(newPassword);

    if (!strongPassword) {
      return res.status(400).json({
        message:
          "New password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      });
    }

    const result = await pool.query(
      `
      SELECT password_hash
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `
      UPDATE users
      SET password_hash = $1
      WHERE id = $2
      `,
      [newPasswordHash, userId]
    );

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Failed to change password" });
  }
});

export default router;