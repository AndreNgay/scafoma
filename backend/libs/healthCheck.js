import { pool } from "./database.js";

/**
 * Database Health Check Utility
 * Provides functions to test and monitor database connectivity
 */

// Test basic database connectivity
export const checkDatabaseConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW() as current_time");
    client.release();

    console.log("✅ Database connection successful");
    console.log("Server time:", result.rows[0].current_time);
    return { success: true, serverTime: result.rows[0].current_time };
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return { success: false, error: error.message };
  }
};

// Test a specific table query (notifications table)
export const checkNotificationsTable = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT COUNT(*) as total FROM tblnotification LIMIT 1"
    );
    client.release();

    console.log("✅ Notifications table accessible");
    console.log("Total notifications:", result.rows[0].total);
    return { success: true, count: result.rows[0].total };
  } catch (error) {
    console.error("❌ Notifications table check failed:", error.message);
    return { success: false, error: error.message };
  }
};

// Get pool status information
export const getPoolStatus = () => {
  const status = {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };

  console.log("🏊 Pool Status:", status);
  return status;
};

// Perform comprehensive health check
export const performHealthCheck = async () => {
  console.log("🔍 Starting database health check...");

  const results = {
    timestamp: new Date().toISOString(),
    poolStatus: getPoolStatus(),
    connection: await checkDatabaseConnection(),
    notificationsTable: await checkNotificationsTable(),
  };

  const allHealthy = results.connection.success && results.notificationsTable.success;

  console.log(allHealthy ? "🎉 All checks passed!" : "⚠️  Some checks failed");

  return {
    ...results,
    healthy: allHealthy,
  };
};

// Force reconnection (useful for recovery)
export const forceReconnect = async () => {
  try {
    console.log("🔄 Forcing database reconnection...");

    // End all connections in the pool
    await pool.end();

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test new connection
    const healthCheck = await checkDatabaseConnection();

    if (healthCheck.success) {
      console.log("✅ Reconnection successful");
    } else {
      console.error("❌ Reconnection failed");
    }

    return healthCheck;
  } catch (error) {
    console.error("❌ Force reconnect error:", error.message);
    return { success: false, error: error.message };
  }
};

// Monitor connections over time
export const startConnectionMonitoring = (intervalMs = 30000) => {
  console.log(`📊 Starting connection monitoring (every ${intervalMs}ms)...`);

  const monitor = setInterval(async () => {
    const poolStatus = getPoolStatus();

    // Log warning if too many connections are waiting
    if (poolStatus.waitingCount > 5) {
      console.warn("⚠️  High number of waiting connections:", poolStatus.waitingCount);
    }

    // Log warning if pool is exhausted
    if (poolStatus.idleCount === 0 && poolStatus.totalCount >= 20) {
      console.warn("⚠️  Connection pool may be exhausted");
      // Perform health check
      await performHealthCheck();
    }
  }, intervalMs);

  return monitor; // Return interval ID so it can be cleared
};

// Handle graceful shutdown
export const gracefulShutdown = async () => {
  console.log("🛑 Shutting down database connections gracefully...");
  try {
    await pool.end();
    console.log("✅ Database connections closed");
  } catch (error) {
    console.error("❌ Error during shutdown:", error.message);
  }
};
