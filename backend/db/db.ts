import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const pool = new Pool({
  connectionString: process.env.DB_URL,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

export default pool;
