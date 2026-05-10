import bcrypt from "bcrypt";
import cors from "cors";
import crypto from "crypto";
import express from "express";
import jwt from "jsonwebtoken";
import { ensureAuthSchema, pool } from "./db.js";
import {
  sendPasswordResetCodeEmail,
  sendVerificationCodeEmail,
} from "./lib/mailer.js";
import { getOpenAI } from "./lib/openai.js";
import { authenticateUser } from "./middleware/auth.js";
import { creditGuard } from "./middleware/creditGuard.js";
import userRoutes from "./routes/user.js";

const app = express();

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, ts: Date.now() });
});

app.use((req, res, next) => {
  console.log("➡️ INCOMING:", req.method, req.url);
  next();
});

app.use(express.json());
app.use(cors());
app.use("/user", userRoutes);

// Health
app.get("/", (req, res) => {
  res.send("🔥 Backend running");
});

app.get("/hello", (req, res) => {
  res.send("Function running ✅");
});

// ================= AUTH =================

const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

function isStrongPassword(password) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function generateOtpCode() {
  return `${crypto.randomInt(100000, 1000000)}`;
}

function hashOtpCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function getOtpExpiryDate() {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}

function getSecondsUntilResend(lastSentAt) {
  if (!lastSentAt) return 0;

  const elapsedMs = Date.now() - new Date(lastSentAt).getTime();
  const remainingMs = OTP_RESEND_COOLDOWN_SECONDS * 1000 - elapsedMs;

  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

app.post("/auth/signup", async (req, res) => {
  const client = await pool.connect();

  try {
    const { firstName, lastName, phoneNumber, email, password } = req.body;

    if (
      !firstName?.trim() ||
      !lastName?.trim() ||
      !phoneNumber?.trim() ||
      !email?.trim() ||
      !password?.trim()
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationCode = generateOtpCode();
    const verificationCodeHash = hashOtpCode(verificationCode);
    const verificationExpires = getOtpExpiryDate();

    await client.query("BEGIN");

    const existingUser = await client.query(
      "SELECT id, email_verified FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      const existing = existingUser.rows[0];

      if (!existing.email_verified) {
        await client.query(
          `
          UPDATE users
          SET
            first_name = $1,
            last_name = $2,
            phone_number = $3,
            password_hash = $4,
            email_verification_code_hash = $5,
            email_verification_expires = $6,
            email_verification_attempts = 0,
            email_verification_last_sent_at = NOW()
          WHERE email = $7
          `,
          [
            firstName.trim(),
            lastName.trim(),
            phoneNumber.trim(),
            passwordHash,
            verificationCodeHash,
            verificationExpires,
            normalizedEmail,
          ]
        );

        await sendVerificationCodeEmail(normalizedEmail, verificationCode);
        await client.query("COMMIT");

        return res.status(200).json({
          message:
            "This email is already registered but not yet verified. A new verification code has been sent.",
          requiresEmailVerification: true,
          email: normalizedEmail,
        });
      }

      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "User already exists",
      });
    }

    await client.query(
      `
      INSERT INTO users (
        first_name,
        last_name,
        phone_number,
        email,
        password_hash,
        plan,
        credits,
        extra_credits,
        email_verified,
        email_verification_code_hash,
        email_verification_expires,
        email_verification_attempts,
        email_verification_last_sent_at
      )
      VALUES ($1, $2, $3, $4, $5, 'free', 15, 0, false, $6, $7, 0, NOW())
      `,
      [
        firstName.trim(),
        lastName.trim(),
        phoneNumber.trim(),
        normalizedEmail,
        passwordHash,
        verificationCodeHash,
        verificationExpires,
      ]
    );

    await sendVerificationCodeEmail(normalizedEmail, verificationCode);

    await client.query("COMMIT");

    res.status(201).json({
      message: "Account created successfully. Enter the verification code sent to your email.",
      requiresEmailVerification: true,
      email: normalizedEmail,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Signup error:", err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
});

app.get("/auth/verify-email", async (_req, res) => {
  res
    .status(410)
    .send(
      "Email verification links are no longer supported. Please open the app and enter the verification code sent to your email."
    );
});

app.post("/auth/verify-email-otp", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email?.trim() || !code?.trim()) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query(
      `
      SELECT
        id,
        email_verified,
        email_verification_code_hash,
        email_verification_expires,
        email_verification_attempts
      FROM users
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or verification code" });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.json({ message: "Email already verified. You can now log in." });
    }

    if (
      !user.email_verification_code_hash ||
      !user.email_verification_expires ||
      new Date(user.email_verification_expires).getTime() < Date.now()
    ) {
      return res.status(400).json({ message: "Verification code is invalid or expired" });
    }

    if ((user.email_verification_attempts || 0) >= OTP_MAX_ATTEMPTS) {
      return res.status(400).json({
        message: "Too many failed attempts. Please request a new verification code.",
      });
    }

    if (hashOtpCode(code.trim()) !== user.email_verification_code_hash) {
      const attempts = (user.email_verification_attempts || 0) + 1;

      await pool.query(
        `
        UPDATE users
        SET
          email_verification_attempts = $1,
          email_verification_code_hash = CASE
            WHEN $1 >= $2 THEN NULL
            ELSE email_verification_code_hash
          END,
          email_verification_expires = CASE
            WHEN $1 >= $2 THEN NULL
            ELSE email_verification_expires
          END
        WHERE id = $3
        `,
        [attempts, OTP_MAX_ATTEMPTS, user.id]
      );

      return res.status(400).json({
        message:
          attempts >= OTP_MAX_ATTEMPTS
            ? "Too many failed attempts. Please request a new verification code."
            : "Invalid verification code",
      });
    }

    await pool.query(
      `
      UPDATE users
      SET
        email_verified = true,
        email_verification_code_hash = NULL,
        email_verification_expires = NULL,
        email_verification_attempts = 0
      WHERE id = $1
      `,
      [user.id]
    );

    res.json({ message: "Email verified successfully. You can now log in." });
  } catch (err) {
    console.error("Email verification error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/auth/resend-verification-code", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query(
      `
      SELECT id, email_verified, email_verification_last_sent_at
      FROM users
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account not found" });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(400).json({ message: "This account is already verified" });
    }

    const secondsUntilResend = getSecondsUntilResend(user.email_verification_last_sent_at);
    if (secondsUntilResend > 0) {
      return res.status(429).json({
        message: `Please wait ${secondsUntilResend} seconds before requesting another code`,
      });
    }

    const verificationCode = generateOtpCode();

    await pool.query(
      `
      UPDATE users
      SET
        email_verification_code_hash = $1,
        email_verification_expires = $2,
        email_verification_attempts = 0,
        email_verification_last_sent_at = NOW()
      WHERE id = $3
      `,
      [hashOtpCode(verificationCode), getOtpExpiryDate(), user.id]
    );

    await sendVerificationCodeEmail(normalizedEmail, verificationCode);

    res.json({ message: "A new verification code has been sent to your email." });
  } catch (err) {
    console.error("Resend verification code error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query(
      `
      SELECT id, email_verified, password_reset_last_sent_at
      FROM users
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];

      if (user.email_verified) {
        const secondsUntilResend = getSecondsUntilResend(user.password_reset_last_sent_at);

        if (secondsUntilResend === 0) {
          const resetCode = generateOtpCode();

          await pool.query(
            `
            UPDATE users
            SET
              password_reset_code_hash = $1,
              password_reset_expires = $2,
              password_reset_attempts = 0,
              password_reset_last_sent_at = NOW()
            WHERE id = $3
            `,
            [hashOtpCode(resetCode), getOtpExpiryDate(), user.id]
          );

          await sendPasswordResetCodeEmail(normalizedEmail, resetCode);
        }
      }
    }

    res.json({
      message: "If an account with that email exists, a password reset code has been sent.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/auth/reset-password", async (req, res) => {
  try {
    const { email, code, password } = req.body;

    if (!email?.trim() || !code?.trim() || !password?.trim()) {
      return res.status(400).json({ message: "Email, reset code, and new password are required" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query(
      `
      SELECT
        id,
        password_reset_code_hash,
        password_reset_expires,
        password_reset_attempts
      FROM users
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or reset code" });
    }

    const user = result.rows[0];

    if (
      !user.password_reset_code_hash ||
      !user.password_reset_expires ||
      new Date(user.password_reset_expires).getTime() < Date.now()
    ) {
      return res.status(400).json({ message: "Reset code is invalid or expired" });
    }

    if ((user.password_reset_attempts || 0) >= OTP_MAX_ATTEMPTS) {
      return res.status(400).json({
        message: "Too many failed attempts. Please request a new password reset code.",
      });
    }

    if (hashOtpCode(code.trim()) !== user.password_reset_code_hash) {
      const attempts = (user.password_reset_attempts || 0) + 1;

      await pool.query(
        `
        UPDATE users
        SET
          password_reset_attempts = $1,
          password_reset_code_hash = CASE
            WHEN $1 >= $2 THEN NULL
            ELSE password_reset_code_hash
          END,
          password_reset_expires = CASE
            WHEN $1 >= $2 THEN NULL
            ELSE password_reset_expires
          END
        WHERE id = $3
        `,
        [attempts, OTP_MAX_ATTEMPTS, user.id]
      );

      return res.status(400).json({
        message:
          attempts >= OTP_MAX_ATTEMPTS
            ? "Too many failed attempts. Please request a new password reset code."
            : "Invalid reset code",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `
      UPDATE users
      SET
        password_hash = $1,
        password_reset_code_hash = NULL,
        password_reset_expires = NULL,
        password_reset_attempts = 0
      WHERE id = $2
      `,
      [passwordHash, user.id]
    );

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `
      SELECT id, email, password_hash, plan, credits, extra_credits, email_verified
      FROM users
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        message: "Please verify your email address before logging in",
        requiresEmailVerification: true,
        email: user.email,
      });
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
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/ads/reward", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query(
      `
      SELECT plan, credits, extra_credits
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];

    if (user.plan !== "free") {
      return res.status(403).json({
        error: "Ad rewards are available to free users only",
      });
    }

    const updated = await pool.query(
      `
      UPDATE users
      SET extra_credits = extra_credits + 1
      WHERE id = $1
      RETURNING credits, extra_credits
      `,
      [userId]
    );

    const balance = updated.rows[0];

    res.json({
      success: true,
      added: 1,
      totalCredits: balance.credits + balance.extra_credits,
      message: "Credit added successfully",
    });
  } catch (err) {
    console.error("Ad reward error:", err);
    res.status(500).json({ error: "Failed to add ad credit" });
  }
});

// ================= GOOGLE AUTH =================

app.post("/auth/google", async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    let result = await pool.query(
      `
      SELECT id, email, first_name, last_name, plan, credits, extra_credits, email_verified
      FROM users
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    let user;

    if (result.rows.length === 0) {
      const insert = await pool.query(
        `
        INSERT INTO users (
          first_name,
          last_name,
          email,
          plan,
          credits,
          extra_credits,
          email_verified
        )
        VALUES ($1, $2, $3, 'free', 15, 0, true)
        RETURNING id, email, first_name, last_name, plan, credits, extra_credits, email_verified
        `,
        [
          firstName?.trim() || "",
          lastName?.trim() || "",
          normalizedEmail,
        ]
      );

      user = insert.rows[0];
    } else {
      user = result.rows[0];

      // Optional: update missing names / verify existing Google user
      const shouldUpdateNames =
        (!user.first_name && firstName?.trim()) ||
        (!user.last_name && lastName?.trim()) ||
        user.email_verified !== true;

      if (shouldUpdateNames) {
        const updated = await pool.query(
          `
          UPDATE users
          SET
            first_name = COALESCE(NULLIF(first_name, ''), $1),
            last_name = COALESCE(NULLIF(last_name, ''), $2),
            email_verified = true
          WHERE email = $3
          RETURNING id, email, first_name, last_name, plan, credits, extra_credits, email_verified
          `,
          [
            firstName?.trim() || "",
            lastName?.trim() || "",
            normalizedEmail,
          ]
        );

        user = updated.rows[0];
      }
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
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        plan: user.plan,
        credits: user.credits,
        extraCredits: user.extra_credits,
      },
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ message: "Google auth failed" });
  }
});

// ================= AI =================

function getModelConfigForPlan(plan) {
  switch ((plan || "free").toLowerCase()) {
    case "premium":
      return { model: "gpt-5.5", temperature: 1.0 };
    case "basic":
      return { model: "gpt-5.3", temperature: 0.9 };
    case "free":
    default:
      return { model: "gpt-4o-mini", temperature: 0.7 };
  }
}

function getToneGuidance(tone) {
  switch ((tone || "").trim().toLowerCase()) {
    case "funny":
      return "Use light humor and playful phrasing, but keep it warm and socially natural rather than sounding like a joke generator.";
    case "grateful":
      return "Make the appreciation feel sincere, specific, and emotionally grounded instead of overly formal or exaggerated.";
    case "romantic":
      return "Make it affectionate, intimate, and emotionally soft without sounding cheesy, generic, or overdramatic.";
    case "professional":
      return "Keep it polished, respectful, and clear, while still sounding like a real person instead of a corporate template.";
    case "diplomatic":
      return "Be tactful, measured, and considerate. Balance honesty with sensitivity and avoid harsh or blunt phrasing.";
    case "sarcastic":
      return "Use gentle, controlled sarcasm that feels witty and intentional, not rude, aggressive, or cartoonish.";
    case "angry":
      return "Sound upset and firm, but keep the wording coherent, human, and believable rather than explosive or abusive.";
    case "polite":
      return "Keep the message courteous, smooth, and thoughtful without sounding stiff.";
    case "firm":
      return "Be clear and direct, but not cold. Let the firmness sound human and grounded.";
    case "neutral":
      return "Keep it balanced, natural, and easy to read.";
    default:
      return tone
        ? `Honor the requested tone of "${tone}" in a natural, believable way without forcing it.`
        : "Keep the tone natural, balanced, and human.";
  }
}

function getCategoryGuidance(category) {
  switch ((category || "").trim().toLowerCase()) {
    case "birthday":
      return "Make it celebratory and personal. Include warmth, affection, and a detail that makes it feel like it was written for one specific person.";
    case "anniversary":
      return "Focus on shared memories, appreciation, and emotional depth. Let it feel reflective and personal.";
    case "wedding anniversary":
      return "Blend romance, gratitude, and shared history. Make it feel intimate and meaningful.";
    case "new month":
      return "Make it uplifting and forward-looking, but avoid sounding like a generic motivational broadcast.";
    case "new year":
      return "Balance hope, reflection, and fresh-start energy. Keep it human and not overly slogan-like.";
    case "christmas":
      return "Make it festive, warm, and heartfelt. Avoid sounding mass-produced or like a greeting-card cliché.";
    case "wedding":
      return "Sound joyful, affectionate, and celebratory, with a sense of blessing and genuine happiness for the couple.";
    case "apology":
      return "Make it accountable, sincere, and emotionally aware. Avoid defensive language, excuses, or empty generic apologies.";
    case "congratulations":
      return "Celebrate the achievement with specific, believable enthusiasm instead of broad generic praise.";
    case "graduation":
      return "Recognize the effort behind the milestone and sound proud, encouraging, and personal.";
    case "promotion":
      return "Acknowledge the hard work, growth, and deserved success behind the achievement.";
    default:
      return category
        ? `Write it in a way that fits the category "${category}" naturally and convincingly.`
        : "Fit the message naturally to the requested purpose.";
  }
}

function getBusinessToneGuidance(tone) {
  switch ((tone || "").trim().toLowerCase()) {
    case "professional":
      return "Keep the copy clear, polished, and trustworthy without sounding dry or overly corporate.";
    case "persuasive":
      return "Highlight value and encourage action confidently, but avoid sounding pushy, manipulative, or spammy.";
    case "friendly":
      return "Sound approachable, warm, and customer-friendly while staying business-appropriate.";
    case "urgent":
      return "Create momentum and time sensitivity, but keep it credible and not alarmist.";
    case "luxury":
      return "Use refined, elevated language that feels premium and aspirational without sounding exaggerated.";
    case "confident":
      return "Sound assured, competent, and convincing while staying natural and believable.";
    case "warm":
      return "Make the message welcoming and relationship-oriented while still sounding business-focused.";
    case "exciting":
      return "Use energetic wording that feels fresh and lively without becoming noisy or childish.";
    case "direct":
      return "Be concise, punchy, and easy to act on without sounding abrupt.";
    default:
      return tone
        ? `Honor the requested business tone of "${tone}" naturally and convincingly.`
        : "Keep the business message natural, persuasive, and easy to act on.";
  }
}

function getCorporateGoalGuidance(category) {
  switch ((category || "").trim().toLowerCase()) {
    case "promotion":
      return "Focus on visibility, excitement, and a clear reason for the audience to care right now.";
    case "sales":
      return "Emphasize value, problem-solving, and a clear buying motivation without sounding desperate.";
    case "offer":
      return "Lead with the deal clearly, explain the benefit, and make the next step obvious.";
    case "product launch":
      return "Introduce the product as something new and compelling, highlighting the most attractive benefits.";
    case "announcement":
      return "Be clear, informative, and audience-friendly while keeping the writing polished.";
    case "reminder":
      return "Sound helpful and timely rather than nagging. Keep the message easy to scan.";
    case "customer retention":
      return "Reinforce trust, appreciation, and continued value to keep customers engaged.";
    case "holiday campaign":
      return "Blend seasonal energy with promotional clarity. Make it timely and relevant.";
    case "event marketing":
      return "Build anticipation, explain the value of attending, and include a strong invitation.";
    case "follow-up":
      return "Keep it courteous, purposeful, and specific about the next step or expected response.";
    case "email campaign":
      return "Structure the message so it reads well as marketing email copy with a clear hook and call to action.";
    default:
      return category
        ? `Write it in a way that naturally suits the business goal "${category}".`
        : "Fit the business message naturally to the requested purpose.";
  }
}

function getPlatformGuidance(platform) {
  switch ((platform || "").trim().toLowerCase()) {
    case "instagram":
      return "Keep it visually punchy, scroll-stopping, and caption-friendly. Favor short lines, promotional energy, and wording that works well with a clear call to action.";
    case "whatsapp":
      return "Make it feel direct, personal, and easy to read in chat format. It should sound like a business message that still feels human and conversational.";
    case "x":
      return "Keep it concise, sharp, and easy to scan quickly. Focus on one main hook and avoid unnecessary filler.";
    case "facebook":
      return "Balance clarity and warmth, with enough detail to feel informative but not long-winded. It should work well as a public-facing business post.";
    case "email":
      return "Make it read like business email copy with a clear opening hook, useful detail, and strong call to action. Structure it so it feels polished and easy to skim.";
    case "sms":
      return "Keep it short, direct, and immediately actionable. Every word should earn its place.";
    case "linkedin":
      return "Use a professional and credible tone suitable for business audiences. It should sound polished, thoughtful, and brand-safe.";
    case "website":
      return "Make it headline-friendly and polished, with clear value, strong clarity, and wording that could fit a website hero, banner, or featured section.";
    default:
      return platform
        ? `Adapt the wording so it feels appropriate for ${platform}.`
        : "Adapt the writing to the requested platform naturally.";
  }
}

function getLengthGuidance(messageLength) {
  switch ((messageLength || "").trim().toLowerCase()) {
    case "short":
      return "Keep it compact, punchy, and immediately usable.";
    case "long":
      return "Allow more detail, explanation, and structure while staying engaging and readable.";
    case "medium":
    default:
      return "Keep it balanced: detailed enough to persuade, but still concise and easy to scan.";
  }
}

function getReplySituationGuidance(message) {
  const normalized = (message || "").toLowerCase();

  if (
    normalized.includes("sorry") ||
    normalized.includes("apolog") ||
    normalized.includes("forgive")
  ) {
    return "This appears to be an apology or emotionally sensitive exchange, so the reply should feel emotionally aware and genuine.";
  }

  if (
    normalized.includes("congrat") ||
    normalized.includes("well done") ||
    normalized.includes("proud of you")
  ) {
    return "This appears to be a celebratory or encouraging exchange, so the reply can sound appreciative, warm, and naturally happy.";
  }

  if (
    normalized.includes("love") ||
    normalized.includes("miss you") ||
    normalized.includes("dear") ||
    normalized.includes("baby")
  ) {
    return "This appears to be an affectionate or intimate exchange, so the reply should sound soft, personal, and emotionally natural.";
  }

  if (
    normalized.includes("?") ||
    normalized.includes("can you") ||
    normalized.includes("could you") ||
    normalized.includes("would you")
  ) {
    return "This appears to involve a request or question, so the reply should sound direct, relevant, and naturally responsive.";
  }

  if (
    normalized.includes("invite") ||
    normalized.includes("join us") ||
    normalized.includes("come through") ||
    normalized.includes("attend")
  ) {
    return "This appears to be an invitation or social plan, so the reply should feel friendly, specific, and socially natural.";
  }

  if (
    normalized.includes("issue") ||
    normalized.includes("problem") ||
    normalized.includes("disappoint") ||
    normalized.includes("upset")
  ) {
    return "This appears to involve tension or dissatisfaction, so the reply should feel measured, human, and emotionally intelligent.";
  }

  return "Respond directly to the message in a way that feels socially natural, emotionally believable, and context-aware.";
}

app.post("/generate", authenticateUser, creditGuard, async (req, res) => {
  try {
    const {
      mode = "individual",
      tone,
      category,
      name,
      sender,
      relationship,
      context,
      language,
      businessName,
      productName,
      platform,
      audience,
      callToAction,
      messageLength,
    } = req.body;

    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }

    const finalLanguage = language?.trim() || "English";
    const modelConfig = getModelConfigForPlan(req.currentPlan || req.user.plan);
    const isCorporateMode = String(mode).trim().toLowerCase() === "corporate";
    const toneGuidance = isCorporateMode
      ? getBusinessToneGuidance(tone || "professional")
      : getToneGuidance(tone || "neutral");
    const categoryGuidance = isCorporateMode
      ? getCorporateGoalGuidance(category)
      : getCategoryGuidance(category);
    const platformGuidance = isCorporateMode
      ? getPlatformGuidance(platform)
      : "";
    const lengthGuidance = isCorporateMode
      ? getLengthGuidance(messageLength)
      : "";

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: modelConfig.model,
      messages: [
        {
          role: "system",
          content: isCorporateMode
            ? `You are a skilled business copywriter for small businesses, creators, and brands.

Write marketing and business messages that sound natural, credible, and audience-aware.
Keep the writing persuasive and polished without sounding spammy, robotic, or like generic ad copy.
Adapt the message to the requested platform, business goal, audience, and tone.
Use clear benefits, natural wording, and a believable call to action.
Do not sound like a stiff corporate memo, a template, or an AI assistant.
Unless the user explicitly asks for a long message, keep it readable and easy to use immediately.`
            : `You are a thoughtful personal message writer.

Write messages that sound human, natural, and emotionally believable.
Use a conversational tone with subtle emotional nuance.
Let the writing feel personal and slightly imperfect in a realistic way, not robotic or over-polished.
Avoid generic filler, stiff phrasing, cliches, and repetitive stock expressions.
Do not sound like a template, an assistant, or a formal corporate writer.
Vary sentence rhythm and structure naturally.
Keep the message appropriate to the user's requested tone and context.
Unless the user clearly asks for a long message, keep it concise and readable.

IMPORTANT: You must write the entire response in ${finalLanguage}. If that is not possible, use English.`,
        },
        {
          role: "user",
          content: isCorporateMode
            ? `Write a ${category} business message.

Tone: ${tone || "professional"}
Business name: ${businessName || "Not specified"}
Product or service: ${productName || "Not specified"}
Platform: ${platform || "Not specified"}
Target audience: ${audience || "Not specified"}
Message length: ${messageLength || "Medium"}
Offer details and campaign context: ${context || "None"}
Call to action to include: ${callToAction || "Not specified"}

Business goal guidance: ${categoryGuidance}
Business tone guidance: ${toneGuidance}
Platform guidance: ${platformGuidance}
Length guidance: ${lengthGuidance}

Make it sound like thoughtful, effective business copy a real brand could send.
Keep it audience-aware, natural, and persuasive.
Avoid generic buzzwords, robotic ad language, and empty hype.`
            : `Write a ${category} message that feels personal and authentic.

Tone: ${tone || "neutral"}
Recipient name: ${name || "Not specified"}
Sender's name: ${sender || "Not specified"}
Relationship to sender: ${relationship || "Not specified"}
Context and details to include: ${context || "None"}

Category guidance: ${categoryGuidance}
Tone guidance: ${toneGuidance}

Make it sound natural, heartfelt when appropriate, and like something a real person would send.
Avoid generic phrases. Include emotional nuance and conversational warmth.
If helpful, use small human touches like natural wording, slight imperfection, or specific emotional detail, but do not make the writing sloppy.`,
        },
      ],
      temperature: modelConfig.temperature,
    });

    res.json({
      result: completion.choices[0].message.content,
      remainingCredits: req.remainingCredits,
    });
  } catch (error) {
    console.error("❌ AI ERROR:", error);
    res.status(500).json({
      message: "AI generation failed",
      debug: error.message,
    });
  }
});

// Respond
app.post("/respond", authenticateUser, creditGuard, async (req, res) => {
  try {
    const { message, tone, language } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    const finalLanguage = language?.trim() || "English";
    const modelConfig = getModelConfigForPlan(req.currentPlan || req.user.plan);
    const toneGuidance = getToneGuidance(tone || "polite");
    const replySituationGuidance = getReplySituationGuidance(message);

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: modelConfig.model,
      messages: [
        {
          role: "system",
          content: `You write replies that feel human, relaxed, and socially natural.
Avoid robotic phrasing, generic polite filler, and overly perfect wording.
Keep the reply believable, emotionally aware, and conversational.
Match the user's requested tone without sounding forced.
Let the reply sound like something a real person would actually send in chat or text.
Keep it relevant to the message instead of drifting into generic filler.
Unless the user clearly asks for a long reply, keep it concise and natural.

IMPORTANT: You must write the entire response in ${finalLanguage}. If that is not possible, use English.`,
        },
        {
          role: "user",
          content: `Reply to the following message in a ${tone || "polite"} tone:

"${message}"

Tone guidance: ${toneGuidance}
Situation guidance: ${replySituationGuidance}

Make the reply sound natural, personal, and like a real person wrote it.
Avoid generic phrases, robotic politeness, and stiff template wording.`,
        },
      ],
      temperature: modelConfig.temperature,
    });

    res.json({
      result: completion.choices[0].message.content,
      remainingCredits: req.remainingCredits,
    });
  } catch (error) {
    console.error("❌ RESPOND ERROR:", error);
    res.status(500).json({
      message: "AI response failed",
      debug: error.message,
    });
  }
});

// Translate
app.post("/translate", authenticateUser, creditGuard, async (req, res) => {
  try {
    const { message, targetLanguage } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const finalLanguage = targetLanguage?.trim() || "English";
    const modelConfig = getModelConfigForPlan(req.currentPlan || req.user.plan);

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: modelConfig.model,
      messages: [
        {
          role: "system",
          content:
            "You are a translation engine. Translate text exactly and output ONLY the translated text.",
        },
        {
          role: "user",
          content: `Translate the following text into ${finalLanguage}:\n\n"${message}"`,
        },
      ],
      temperature: 0,
    });

    res.json({
      result: completion.choices[0].message.content,
      remainingCredits: req.remainingCredits,
    });
  } catch (error) {
    console.error("❌ TRANSLATE ERROR:", error);
    res.status(500).json({
      message: "AI translation failed",
      debug: error.message,
    });
  }
});

const PORT = process.env.PORT || 10000;

async function startServer() {
  await ensureAuthSchema();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

// ================= EXPORT =================
export default app;
