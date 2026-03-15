import bcrypt from "bcrypt";
import cors from "cors";
import crypto from "crypto";
import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";
import { sendVerificationEmail } from "./lib/mailer.js";
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

app.post("/auth/signup", async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, country, email, password } = req.body;

    if (
      !firstName?.trim() ||
      !lastName?.trim() ||
      !phoneNumber?.trim() ||
      !country?.trim() ||
      !email?.trim() ||
      !password?.trim()
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const strongPassword =
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password);

    if (!strongPassword) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await pool.query(
      "SELECT id, email_verified FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `
      INSERT INTO users (
        first_name,
        last_name,
        phone_number,
        country,
        email,
        password_hash,
        plan,
        credits,
        extra_credits,
        email_verified,
        email_verification_token,
        email_verification_expires
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'free', 15, 0, false, $7, $8)
      `,
      [
        firstName.trim(),
        lastName.trim(),
        phoneNumber.trim(),
        country.trim(),
        normalizedEmail,
        passwordHash,
        verificationToken,
        verificationExpires,
      ]
    );

    await sendVerificationEmail(normalizedEmail, verificationToken);

    res.status(201).json({
      message:
        "Account created successfully. Please check your email to verify your account.",
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/auth/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send("Invalid verification link");
    }

    const result = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email_verification_token = $1
        AND email_verification_expires > NOW()
      `,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).send("Verification link is invalid or expired");
    }

    const userId = result.rows[0].id;

    await pool.query(
      `
      UPDATE users
      SET
        email_verified = true,
        email_verification_token = NULL,
        email_verification_expires = NULL
      WHERE id = $1
      `,
      [userId]
    );

    res.send("Email verified successfully. You can now return to the app and log in.");
  } catch (err) {
    console.error("Email verification error:", err);
    res.status(500).send("Internal server error");
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const result = await pool.query(
      `
      SELECT id, email, password_hash, plan, credits, extra_credits
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    let result = await pool.query(
      `SELECT id, email, plan, credits, extra_credits
       FROM users
       WHERE email = $1`,
      [email]
    );

    let user;

    if (result.rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO users (email, plan, credits, extra_credits)
         VALUES ($1, 'free', 15, 0)
         RETURNING id, email, plan, credits, extra_credits`,
        [email]
      );

      user = insert.rows[0];
    } else {
      user = result.rows[0];
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ================= EXPORT =================
export default app;
