import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("❌ OPENAI_API_KEY is missing at runtime");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
