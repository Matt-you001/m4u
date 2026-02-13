/*import bcrypt from "bcrypt";
import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = express.Router();

/**
 * POST /auth/register
 */
/*router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `
      INSERT INTO users (email, password, plan, credits, extra_credits)
      VALUES ($1, $2, 'free', 15, 0)
      RETURNING id, email, plan, credits, extra_credits
      `,
      [email, hashedPassword]
    );

    const user = rows[0];

    const token = jwt.sign(
      {
        id: user.id,
        plan: user.plan,
        credits: user.credits,
        extraCredits: user.extra_credits,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * POST /auth/login
 */
/*router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const { rows } = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        plan: user.plan,
        credits: user.credits,
        extraCredits: user.extra_credits,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        credits: user.credits,
        extraCredits: user.extra_credits,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;*/
