import express from 'express';
import {
  performHealthCheck,
  checkDatabaseConnection,
  getPoolStatus,
  forceReconnect
} from '../libs/healthCheck.js';

const router = express.Router();

// GET /health - Basic health check
router.get('/', async (req, res) => {
  try {
    const healthCheck = await performHealthCheck();

    const statusCode = healthCheck.healthy ? 200 : 503;

    res.status(statusCode).json({
      status: healthCheck.healthy ? 'healthy' : 'unhealthy',
      timestamp: healthCheck.timestamp,
      checks: {
        database: healthCheck.connection.success,
        notifications: healthCheck.notificationsTable.success,
        pool: healthCheck.poolStatus
      },
      details: healthCheck
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /health/database - Database connection test
router.get('/database', async (req, res) => {
  try {
    const result = await checkDatabaseConnection();

    const statusCode = result.success ? 200 : 503;

    res.status(statusCode).json({
      status: result.success ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /health/pool - Pool status information
router.get('/pool', (req, res) => {
  try {
    const poolStatus = getPoolStatus();

    res.status(200).json({
      status: 'success',
      timestamp: new Date().toISOString(),
      pool: poolStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /health/reconnect - Force database reconnection
router.post('/reconnect', async (req, res) => {
  try {
    console.log('Health check: Force reconnect requested');
    const result = await forceReconnect();

    const statusCode = result.success ? 200 : 503;

    res.status(statusCode).json({
      status: result.success ? 'reconnected' : 'failed',
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
