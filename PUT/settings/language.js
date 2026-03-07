import { authenticateUser } from "./middleware/auth.js";

app.put("/settings/language", authenticateUser, async (req, res) => {
  const { language } = req.body;

  if (!language || language.trim() === "") {
    return res.status(400).json({ error: "Language is required" });
  }

  await pool.query(
    "UPDATE users SET preferred_language = $1 WHERE id = $2",
    [language.trim(), req.user.userId]
  );

  res.json({
    message: "Default language saved",
    language
  });
});
