import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import cafeteriaRoutes from './cafeteriaRoutes.js';
import concessionRoutes from './concessionRoutes.js';
import concessionaireRoutes from './concessionaireRoutes.js';
import menuItemRoutes from './menuItemRoutes.js';


const router = express.Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/cafeteria', cafeteriaRoutes); 
router.use('/concession', concessionRoutes); 
router.use('/menu-item', menuItemRoutes); 
router.use('/concessionaire', concessionaireRoutes); 

export default router;