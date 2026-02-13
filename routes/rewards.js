import express from 'express';
import db from '../db.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

/**
 * 🎥 Ad Reward – Free users only
 */
router.post('/credits/ad-reward', authenticateUser, async (req, res) => {
  const userId = req.user.id;

  const { rows } = await db.query(
    'SELECT plan, credits, extra_credits FROM users WHERE id = $1',
    [userId]
  );

  const user = rows[0];

  if (user.plan !== 'free') {
    return res.status(403).json({
      error: 'Ad rewards are for free users only',
    });
  }

  await db.query(
    'UPDATE users SET extra_credits = extra_credits + 1 WHERE id = $1',
    [userId]
  );

  res.json({
    message: '🎉 Credit added',
    totalCredits: user.credits + user.extra_credits + 1,
  });
});

/**
 * 💳 Paid Top-up – Basic & Premium
 */
router.post('/credits/topup', authenticateUser, async (req, res) => {
  const { amount } = req.body;
  const userId = req.user.id;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  // TODO: verify payment (Stripe / Paystack)

  const { rows } = await db.query(
    'SELECT credits, extra_credits FROM users WHERE id = $1',
    [userId]
  );

  await db.query(
    'UPDATE users SET extra_credits = extra_credits + $1 WHERE id = $2',
    [amount, userId]
  );

  res.json({
    message: 'Credits added successfully',
    totalCredits: rows[0].credits + rows[0].extra_credits + amount,
  });
});

export default router;
