import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import cafeteriaRoutes from './cafeteriaRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/cafeteria', cafeteriaRoutes); 

export default router;