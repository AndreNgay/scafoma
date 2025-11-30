import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URI,
  ssl: { rejectUnauthorized: false }, // Use this line if you're connecting to a remote database with SSL
});

pool.connect()
  .then(() => console.log("Database connected"))
  .catch(err => console.error("Connection error:", err.message));
