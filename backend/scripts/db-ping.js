#!/usr/bin/env node

/**
 * Database Ping Utility
 * A standalone script to test database connectivity and diagnose connection issues
 *
 * Usage:
 *   node scripts/db-ping.js
 *   node scripts/db-ping.js --continuous
 *   node scripts/db-ping.js --help
 */

import { performHealthCheck, checkDatabaseConnection, getPoolStatus } from '../libs/healthCheck.js';
import dotenv from 'dotenv';

dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const isContinuous = args.includes('--continuous') || args.includes('-c');
const showHelp = args.includes('--help') || args.includes('-h');

function showHelpMessage() {
  console.log(`
Database Ping Utility

Usage:
  node scripts/db-ping.js [options]

Options:
  --continuous, -c    Run continuously every 5 seconds
  --help, -h         Show this help message

Examples:
  node scripts/db-ping.js                # Single ping
  node scripts/db-ping.js --continuous   # Continuous monitoring
`);
}

async function singlePing() {
  console.log('🏓 Database Ping Test');
  console.log('=' .repeat(50));

  const startTime = Date.now();

  try {
    // Test basic connection
    const connectionTest = await checkDatabaseConnection();
    const connectionTime = Date.now() - startTime;

    if (connectionTest.success) {
      console.log(`✅ Connection: OK (${connectionTime}ms)`);
      console.log(`📅 Server Time: ${connectionTest.serverTime}`);
    } else {
      console.log(`❌ Connection: FAILED`);
      console.log(`🔍 Error: ${connectionTest.error}`);
    }

    // Show pool status
    const poolStatus = getPoolStatus();
    console.log(`🏊 Pool Status:`);
    console.log(`   Total: ${poolStatus.totalCount}`);
    console.log(`   Idle: ${poolStatus.idleCount}`);
    console.log(`   Waiting: ${poolStatus.waitingCount}`);

    // Comprehensive health check
    console.log('\n🔍 Comprehensive Health Check:');
    const healthCheck = await performHealthCheck();

    if (healthCheck.healthy) {
      console.log('🎉 Overall Status: HEALTHY');
    } else {
      console.log('⚠️  Overall Status: UNHEALTHY');
      console.log('Issues found:');
      if (!healthCheck.connection.success) {
        console.log('  - Database connection failed');
      }
      if (!healthCheck.notificationsTable.success) {
        console.log('  - Notifications table inaccessible');
      }
    }

    return healthCheck.healthy;

  } catch (error) {
    console.log(`❌ Ping failed: ${error.message}`);
    return false;
  } finally {
    console.log('=' .repeat(50));
  }
}

async function continuousPing() {
  console.log('🔄 Starting continuous database monitoring...');
  console.log('Press Ctrl+C to stop\n');

  let consecutiveFailures = 0;

  const pingInterval = setInterval(async () => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] Testing connection...`);

    const isHealthy = await singlePing();

    if (isHealthy) {
      consecutiveFailures = 0;
    } else {
      consecutiveFailures++;
      console.log(`⚠️  Consecutive failures: ${consecutiveFailures}`);

      if (consecutiveFailures >= 3) {
        console.log('🚨 Multiple consecutive failures detected!');
        console.log('Consider checking:');
        console.log('  - Database server status');
        console.log('  - Network connectivity');
        console.log('  - Connection string configuration');
      }
    }

    console.log(`⏰ Next check in 5 seconds...\n`);
  }, 5000);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Stopping continuous monitoring...');
    clearInterval(pingInterval);
    process.exit(0);
  });
}

// Main execution
async function main() {
  if (showHelp) {
    showHelpMessage();
    return;
  }

  console.log(`🚀 Database: ${process.env.DATABASE_URI ? 'Configured' : 'NOT CONFIGURED'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);

  if (!process.env.DATABASE_URI) {
    console.error('❌ DATABASE_URI not found in environment variables');
    console.error('Please check your .env file');
    process.exit(1);
  }

  if (isContinuous) {
    await continuousPing();
  } else {
    const isHealthy = await singlePing();
    process.exit(isHealthy ? 0 : 1);
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the script
main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
