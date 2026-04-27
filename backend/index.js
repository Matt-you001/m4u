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

app.post("/generate", authenticateUser, creditGuard, async (req, res) => {
  try {
    const { tone, category, name, gender, relationship, context, language } =
      req.body;

    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }

    const finalLanguage = language?.trim() || "English";

    const prompt = `
You are a message-writing assistant.

IMPORTANT: You MUST write the entire response in ${finalLanguage}. 
If you cannot write in ${finalLanguage}, respond in English.

Write a ${category} message in a ${tone || "neutral"} tone.

Recipient Gender: ${gender || "Not specified"}
Recipient Name: ${name || "None"}
Relationship: ${relationship || "Not specified"}
Context: ${context || "None"}
`;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
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

    const prompt = `
Respond in ${finalLanguage}.

User message:
"${message}"

Tone: ${tone || "polite"}
`;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
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

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
