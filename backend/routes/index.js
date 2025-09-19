import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import cafeteriaRoutes from './cafeteriaRoutes.js';
import concessionRoutes from './concessionRoutes.js';
import concessionaireRoutes from './concessionaireRoutes.js';
import menuItemRoutes from './menuItemRoutes.js';
import orderRoutes from './orderRoutes.js';
import itemVariationRoutes from './itemVariationRoutes.js';
import feedbackRoutes from './feedbackRoutes.js';
import cartRoutes from './cartRoutes.js';


const router = express.Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/order', orderRoutes)
router.use('/cafeteria', cafeteriaRoutes); 
router.use('/concession', concessionRoutes); 
router.use('/menu-item', menuItemRoutes); 
router.use('/concessionaire', concessionaireRoutes); 
router.use('/item-variation', itemVariationRoutes)
router.use('/feedback', feedbackRoutes)
router.use('/cart', cartRoutes)

export default router;