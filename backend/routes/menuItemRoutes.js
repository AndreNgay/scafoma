// routes/menuItemRoutes.js
import express from 'express'
import {
	getMenuItems,
	getMenuItemsByConcessionaire,
	addMenuItem,
	updateMenuItem,
	deleteMenuItem,
	getMenuItemsByAdmin,
	updateMenuItemAvailability,
	upload,
} from '../controllers/menuItemController.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/all', getMenuItems)

router.get('/admin', getMenuItemsByAdmin)

// Concessionaire-specific (requires auth)
router.get('/', authMiddleware, getMenuItemsByConcessionaire)

// Create (multipart/form-data with optional 'image' field)
router.post('/', authMiddleware, upload.single('image'), addMenuItem)

// Update (multipart/form-data; optional 'image' field to replace existing image)
router.put('/:id', authMiddleware, upload.single('image'), updateMenuItem)

// Update availability only
router.put('/:id/availability', updateMenuItemAvailability)

// Delete
router.delete('/:id', authMiddleware, deleteMenuItem)

export default router
