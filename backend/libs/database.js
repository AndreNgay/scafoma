import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URI,
  ssl: { rejectUnauthorized: false },
  // Connection pool configuration
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Connection timeout
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  // Retry configuration
  retryDelay: 5000,
});

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

pool.on("connect", (client) => {
  console.log("New client connected to database");
});

// Test initial connection
pool
  .connect()
  .then((client) => {
    console.log("Database connected successfully");
    client.release();
  })
  .catch((err) => {
    console.error("Initial connection error:", err.message);
    // Retry connection after 5 seconds
    setTimeout(() => {
      console.log("Retrying database connection...");
      pool
        .connect()
        .then((client) => {
          console.log("Database reconnected successfully");
          client.release();
        })
        .catch((retryErr) =>
          console.error("Retry connection failed:", retryErr.message),
        );
    }, 5000);
  });
