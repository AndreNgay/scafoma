import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import cafeteriaRoutes from './cafeteriaRoutes.js';
import concessionRoutes from './concessionRoutes.js';
import concessionaireRoutes from './concessionaireRoutes.js';


const router = express.Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/cafeteria', cafeteriaRoutes); 
router.use('/concession', concessionRoutes); 
router.use('/concessionaire', concessionaireRoutes); 

export default router;