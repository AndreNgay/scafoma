import express from 'express'
import {
	getOrdersByConcessionaireId,
	getOrdersByCustomerId,
	updateOrderStatus,
	updateOrderTotal,
	addOrder,
	deleteOrder,
	updatePaymentProof,
	getCartByCustomerId,
	checkoutCart,
	checkoutSingleOrder,
	updatePaymentMethod,
	getOrderById,
	cancelOrder,
	notifyConcessionaireForOrder,
	rejectReceipt,
	checkAndDeclineExpiredReceipt,
	bulkDeclineExpiredReceipts,
} from '../controllers/orderController.js'
import { upload } from './concessionRoutes.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/concessionare/:id', getOrdersByConcessionaireId)
router.get('/:id', getOrderById)
router.get('/customer/:id', getOrdersByCustomerId)
router.put('/status/:id', updateOrderStatus)
router.put('/:id/recalculate', updateOrderTotal)
router.put(
	'/gcash-screenshot/:id',
	upload.single('gcash_screenshot'),
	updatePaymentProof
)
router.post('/', authMiddleware, addOrder)
router.delete('/:id', deleteOrder)
router.put('/cancel/:id', authMiddleware, cancelOrder) // Cancel order (customer only)
router.get('/cart/:id', getCartByCustomerId) //fetch cart
router.put('/checkout/:id', checkoutCart)
router.put('/checkout-single', checkoutSingleOrder) // Checkout single order by order_id
router.patch('/:id/payment-method', updatePaymentMethod)
router.post('/:id/notify', authMiddleware, notifyConcessionaireForOrder)
router.put('/:id/reject-receipt', rejectReceipt) // Reject receipt and restart timer
router.post('/:id/check-expired', checkAndDeclineExpiredReceipt) // Auto-decline if receipt timer expired
router.post('/bulk-decline-expired', bulkDeclineExpiredReceipts) // Bulk auto-decline expired GCash receipts

export default router
