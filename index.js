import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "./db.js"; // adjust path if needed
import { openai } from "./lib/openai.js";
import { authenticateUser } from "./middleware/auth.js";
import { creditGuard } from "./middleware/creditGuard.js";
import userRoutes from './routes/user.js';
import { getUserPreferredLanguage } from "./utils/getUserLanguage.js";
dotenv.config();

// Initialize OpenAI (from environment)
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is missing");
}

pool.query("SELECT 1")
  .then(() => console.log("✅ PostgreSQL connected"))
  .catch(err => console.error("❌ DB connection error", err));

const app = express();

app.use((req, res, next) => {
  console.log("➡️ INCOMING:", req.method, req.url);
  next();
});

app.use(express.json());
app.use(cors());
app.use('/user', userRoutes);

const PORT = process.env.PORT || 5000;


// Health check
app.get("/", (req, res) => {
  res.send("🔥 LANGUAGE DEBUG BACKEND 🔥");
});

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

    res.status(201).json({
      message: "Signup successful",
      token,
      user,
    });
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

    console.log("🧪 LOGIN DEBUG:", {
      email: user.email,
      hasHash: !!user.password_hash,
    });

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


app.post("/auth/google", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email required" });
  }

  // 1️⃣ Check if user exists
  const existing = await pool.query(
    "SELECT id, email FROM users WHERE email = $1",
    [email]
  );

  let user;

  if (existing.rows.length === 0) {
    // 2️⃣ Create user (password-less)
    const result = await pool.query(
      "INSERT INTO users (email) VALUES ($1) RETURNING id, email",
      [email]
    );
    user = result.rows[0];
  } else {
    user = existing.rows[0];
  }

  // 3️⃣ Issue JWT
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

  res.json({ token, user });
});




// 📨 Message Generator (AI)
app.post("/generate", authenticateUser, creditGuard, async (req, res) => {
  console.log("🔥 GENERATE HIT");
  try {
    const { tone, category, name, gender, relationship, context, language } = req.body;

    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }

    // 🌍 Default fallback
    let finalLanguage = language && language.trim() !== "" ? language : "English";

    // 🧠 Language instructions
    let languageInstruction = "Respond in English.";

    switch (finalLanguage.toLowerCase()) {
      case "french":
        languageInstruction = "Respond in fluent French.";
        break;
      case "spanish":
        languageInstruction = "Respond in fluent Spanish.";
        break;
      case "german":
        languageInstruction = "Respond in German.";
        break;
      case "portuguese":
        languageInstruction = "Respond in Portuguese.";
        break;
      case "italian":
        languageInstruction = "Respond in Italian.";
        break;
      case "dutch":
        languageInstruction = "Respond in Dutch.";
        break;
      case "arabic":
        languageInstruction = "Respond in Arabic.";
        break;
      case "chinese":
        languageInstruction = "Respond in Simplified Chinese.";
        break;
      case "japanese":
        languageInstruction = "Respond in Japanese.";
        break;
      case "korean":
        languageInstruction = "Respond in Korean.";
        break;
      case "hindi":
        languageInstruction = "Respond in Hindi.";
        break;
      case "yoruba":
        languageInstruction = "Respond in Yoruba.";
        break;
      case "igbo":
        languageInstruction = "Respond in Igbo.";
        break;
      case "hausa":
        languageInstruction = "Respond in Hausa.";
        break;
      case "pidgin":
        languageInstruction = "Respond in natural Nigerian Pidgin English.";
        break;
      default:
        languageInstruction = `Respond in ${finalLanguage}. If not possible, respond in English.`;
    }

    const prompt = `
You are a message-writing assistant.

IMPORTANT: You MUST write the entire response in ${finalLanguage}. 
If you cannot write in ${finalLanguage}, then respond in English.

Write a ${category} message in a ${tone || "neutral"} tone.

Recipient Gender: ${gender || "Not specified"}
Recipient Name: ${name || "None"}
Relationship with recipient: ${relationship || "Not specified"}
Context to the message: ${context || "None"}

The message should be:
- Natural and human
- Appropriate to the category
- Written in the specified tone
- Short and ready to send
`;


    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const generatedMessage = completion.choices[0].message.content;
    console.log("🧠 AI OUTPUT (generate):", generatedMessage);
    res.json({ result: generatedMessage });

    } catch (error) {
    console.error("❌ AI ERROR FULL:", {
      message: error.message,
      status: error.status,
      code: error.code,
      stack: error.stack,
    });

    res.json({
      result: generatedMessage,
      remainingCredits: req.remainingCredits
    });

  }

});


// 💬 Message Responder (AI)
app.post("/respond", authenticateUser, creditGuard, async (req, res) => {
  const { message, tone, language } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message required" });
  }

  let finalLanguage = language?.trim();

  if (!finalLanguage) {
    finalLanguage = await getUserPreferredLanguage(req.user.userId);
  }

  const prompt = `
Respond in ${finalLanguage}.

User message:
"${message}"

Tone: ${tone || "polite"}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7
  });

  res.json({
    result: completion.choices[0].message.content,
    remainingCredits: req.remainingCredits
  });

});



// 🌍 Message Translator
app.post("/translate", authenticateUser, creditGuard, async (req, res) => {
  console.log("🔥 TRANSLATE HIT", req.body);

  const { message, targetLanguage } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  // 1️⃣ Manual override
  let finalLanguage = targetLanguage?.trim();

  // 2️⃣ User default
  if (!finalLanguage) {
    finalLanguage = await getUserPreferredLanguage(req.user.userId);
  }

  console.log("🎯 FINAL TRANSLATION LANGUAGE:", finalLanguage);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a translation engine. Translate text exactly and output ONLY the translated text."
      },
      {
        role: "user",
        content: `Translate the following text into ${finalLanguage}:\n\n"${message}"`
      }
    ],
    temperature: 0
  });

  const translatedText = completion.choices[0].message.content;
  res.json({
    result: translatedText,
    remainingCredits: req.remainingCredits
  });

});

app.get('/user/me', authenticateUser, async (req, res) => {
  const result = await pool.query(
    `SELECT id, email, plan, credits, extra_credits
     FROM users WHERE id = $1`,
    [req.user.id]
  );

  res.json(result.rows[0]);
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AI Backend running on http://192.168.1.127:${PORT}`);
});

