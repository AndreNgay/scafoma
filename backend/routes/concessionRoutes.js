// concessionRoutes.js
import express from 'express'
import {
	getConcessions,
	getConcessionById,
	createConcession,
	updateConcession,
	deleteConcession,
	updateMyConcession,
	updateConcessionStatus,
} from '../controllers/concessionController.js'
import authMiddleware from '../middleware/authMiddleware.js'
import multer from 'multer'

const storage = multer.memoryStorage()
export const upload = multer({ storage })

const router = express.Router()

// Public
router.get('/all', getConcessions)
router.get('/:id', getConcessionById)

// Protected
router.get('/', authMiddleware, getConcessionById)
router.put('/me', authMiddleware, upload.single('image'), updateMyConcession)

// Create/Update/Delete
router.post('/', createConcession)
router.put('/:id/status', updateConcessionStatus)
router.put('/:id', updateConcession)
router.delete('/:id', deleteConcession)

export default router
