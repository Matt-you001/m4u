import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

console.log("DB URL LOADED:", process.env.DATABASE_URL);

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
