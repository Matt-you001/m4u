import bcrypt from "bcrypt";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";
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

/**
 * ✅ Debug JWT (does NOT leak secret)
 */
app.get("/debug/jwt", (req, res) => {
  const secret = process.env.JWT_SECRET || "";
  res.json({
    hasJWT_SECRET: !!secret,
    jwtSecretLen: secret.length,
  });
});

/**
 * ✅ Debug DB info (does NOT leak password)
 */
app.get("/debug/dbinfo", async (req, res) => {
  try {
    const url = process.env.DB_URL || "";
    res.json({
      hasDB_URL: !!process.env.DB_URL,
      dbUrlStartsWith: url.slice(0, 30),
    });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

// ================= AUTH =================

app.post("/auth/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password too short" });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (email, password_hash, plan, credits, extra_credits)
      VALUES ($1, $2, 'free', 15, 0)
      RETURNING id, email, plan, credits, extra_credits
      `,
      [email, passwordHash]
    );

    const user = result.rows[0];

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

    res.status(201).json({ message: "Signup successful", token, user });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Internal server error" });
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
    res.status(500).json({ message: "AI generation failed" });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ================= EXPORT =================
export default app;
