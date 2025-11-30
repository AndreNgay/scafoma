import { pool } from '../libs/database.js'
import multer from 'multer'
import {
	notifyNewOrder,
	notifyOrderStatusChange,
	notifyOrderCancelledForConcessionaire,
} from '../services/notificationService.js'

const storage = multer.memoryStorage()
export const upload = multer({ storage })

// Helper: convert BYTEA image to base64 data URL
const makeImageDataUrl = (imageBuffer, mime = 'jpeg') => {
	if (!imageBuffer) return null
	const base64 = Buffer.from(imageBuffer).toString('base64')
	return `data:image/${mime};base64,${base64}`
}

export const getOrdersByConcessionaireId = async (req, res) => {
	const { id } = req.params // concessionaire_id
	const { page = 1, limit = 10, segment } = req.query

	try {
		const offset = (page - 1) * limit

		const activeStatuses = [
			'pending',
			'accepted',
			'ready-for-pickup',
			'ready for pickup',
		] // handle both spellings
		const historyStatuses = ['completed', 'declined', 'cancelled']
		const isActiveSegment = segment === 'active'

		if (isActiveSegment) {
			const activeRes = await pool.query(
				`SELECT o.*, 
                u.first_name, u.last_name, u.email, u.profile_image,
                c.concession_name,
                (
                  SELECT ARRAY(
                    SELECT m.item_name
                    FROM tblorderdetail d
                    JOIN tblmenuitem m ON d.item_id = m.id
                    WHERE d.order_id = o.id
                    ORDER BY d.id
                    LIMIT 3
                  )
                ) AS item_names_preview,
                (
                  SELECT COUNT(*)::int FROM tblorderdetail d2 WHERE d2.order_id = o.id
                ) AS item_count,
                -- Convert UTC to Asia/Manila and add 8 hours
                (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as created_at,
                (o.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as updated_at,
                (o.accepted_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as accepted_at,
                (o.payment_receipt_expires_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as payment_receipt_expires_at
         FROM tblorder o
         JOIN tbluser u ON o.customer_id = u.id
         JOIN tblconcession c ON o.concession_id = c.id
         WHERE c.concessionaire_id = $1
           AND LOWER(o.order_status) = ANY($2)
         ORDER BY o.created_at DESC`,
				[id, activeStatuses.map((s) => s.toLowerCase())]
			)

			const orders = activeRes.rows.map((order) => ({
				...order,
				profile_image: makeImageDataUrl(order.profile_image),
			}))

			return res.status(200).json({
				page: 1,
				limit: Number(limit),
				total: orders.length,
				totalPages: 1,
				data: orders,
			})
		}

		// Default: history segment paginated
		const histRes = await pool.query(
			`SELECT o.*, 
              u.first_name, u.last_name, u.email, u.profile_image,
              c.concession_name,
              (
                SELECT ARRAY(
                  SELECT m.item_name
                  FROM tblorderdetail d
                  JOIN tblmenuitem m ON d.item_id = m.id
                  WHERE d.order_id = o.id
                  ORDER BY d.id
                  LIMIT 3
                )
              ) AS item_names_preview,
              (
                SELECT COUNT(*)::int FROM tblorderdetail d2 WHERE d2.order_id = o.id
              ) AS item_count,
              -- Convert UTC to Asia/Manila and add 8 hours
              (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as created_at,
              (o.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as updated_at,
              (o.accepted_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as accepted_at,
              (o.payment_receipt_expires_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as payment_receipt_expires_at
       FROM tblorder o
       JOIN tbluser u ON o.customer_id = u.id
       JOIN tblconcession c ON o.concession_id = c.id
       WHERE c.concessionaire_id = $1
         AND LOWER(o.order_status) = ANY($2)
       ORDER BY o.created_at DESC
       LIMIT $3 OFFSET $4`,
			[id, historyStatuses.map((s) => s.toLowerCase()), limit, offset]
		)

		const countResult = await pool.query(
			`SELECT COUNT(*) AS total
       FROM tblorder o
       JOIN tblconcession c ON o.concession_id = c.id
       WHERE c.concessionaire_id = $1
         AND LOWER(o.order_status) = ANY($2)`,
			[id, historyStatuses.map((s) => s.toLowerCase())]
		)

		const orders = histRes.rows.map((order) => ({
			...order,
			profile_image: makeImageDataUrl(order.profile_image),
		}))

		const totalOrders = parseInt(countResult.rows[0].total, 10)

		return res.status(200).json({
			page: Number(page),
			limit: Number(limit),
			total: totalOrders,
			totalPages: Math.ceil(totalOrders / limit),
			data: orders,
		})
	} catch (error) {
		console.error('Error fetching orders:', error)
		return res
			.status(500)
			.json({ message: 'Server error while fetching orders' })
	}
}

// ==========================
// Get orders for a customer
// Supports segment=active|history similar to concessionaire API
// ==========================
export const getOrdersByCustomerId = async (req, res) => {
	const { id } = req.params
	const { page = 1, limit = 10, segment } = req.query

	try {
		const offset = (page - 1) * limit

		const activeStatuses = [
			'pending',
			'accepted',
			'ready-for-pickup',
			'ready for pickup', // handle both spellings
		]
		const historyStatuses = ['completed', 'declined', 'cancelled']

		const isActiveSegment = segment === 'active'
		const isHistorySegment = segment === 'history'

		// Active segment: return all ongoing orders without pagination
		if (isActiveSegment) {
			const result = await pool.query(
				`SELECT o.*, 
                o.payment_method,
                o.accepted_at,
                c.concession_name,
                c.receipt_timer,
                caf.cafeteria_name,
                COALESCE(c.gcash_payment_available, FALSE) AS gcash_payment_available,
                COALESCE(c.oncounter_payment_available, FALSE) AS oncounter_payment_available,
                (
                  SELECT ARRAY(
                    SELECT m.item_name
                    FROM tblorderdetail d
                    JOIN tblmenuitem m ON d.item_id = m.id
                    WHERE d.order_id = o.id
                    ORDER BY d.id
                    LIMIT 3
                  )
                ) AS item_names_preview,
                (
                  SELECT COUNT(*)::int FROM tblorderdetail d2 WHERE d2.order_id = o.id
                ) AS item_count,
                -- Convert UTC to Asia/Manila and add 8 hours
                (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as created_at,
                (o.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as updated_at,
                (o.accepted_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as accepted_at,
                (o.payment_receipt_expires_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as payment_receipt_expires_at,
                (o.schedule_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as schedule_time
         FROM tblorder o
         JOIN tblconcession c ON o.concession_id = c.id
         JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
         WHERE o.customer_id = $1
           AND o.in_cart = FALSE
           AND LOWER(o.order_status) = ANY($2)
         ORDER BY o.created_at DESC`,
				[id, activeStatuses.map((s) => s.toLowerCase())]
			)

			const orders = result.rows.map((order) => {
				order.payment_proof = makeImageDataUrl(order.gcash_screenshot)
				return order
			})

			return res.status(200).json({
				page: 1,
				limit: Number(limit),
				total: orders.length,
				totalPages: 1,
				data: orders,
			})
		}

		// History segment: paginated completed/declined/cancelled orders
		if (isHistorySegment) {
			const result = await pool.query(
				`SELECT o.*, 
                o.payment_method,
                o.accepted_at,
                c.concession_name,
                c.receipt_timer,
                caf.cafeteria_name,
                COALESCE(c.gcash_payment_available, FALSE) AS gcash_payment_available,
                COALESCE(c.oncounter_payment_available, FALSE) AS oncounter_payment_available,
                (
                  SELECT ARRAY(
                    SELECT m.item_name
                    FROM tblorderdetail d
                    JOIN tblmenuitem m ON d.item_id = m.id
                    WHERE d.order_id = o.id
                    ORDER BY d.id
                    LIMIT 3
                  )
                ) AS item_names_preview,
                (
                  SELECT COUNT(*)::int FROM tblorderdetail d2 WHERE d2.order_id = o.id
                ) AS item_count,
                -- Convert UTC to Asia/Manila and add 8 hours
                (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as created_at,
                (o.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as updated_at,
                (o.accepted_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as accepted_at,
                (o.payment_receipt_expires_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as payment_receipt_expires_at,
                (o.schedule_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as schedule_time
         FROM tblorder o
         JOIN tblconcession c ON o.concession_id = c.id
         JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
         WHERE o.customer_id = $1
           AND o.in_cart = FALSE
           AND LOWER(o.order_status) = ANY($2)
         ORDER BY o.created_at DESC
         LIMIT $3 OFFSET $4`,
				[id, historyStatuses.map((s) => s.toLowerCase()), limit, offset]
			)

			const orders = result.rows.map((order) => {
				order.payment_proof = makeImageDataUrl(order.gcash_screenshot)
				return order
			})

			const countResult = await pool.query(
				`SELECT COUNT(*) AS total
         FROM tblorder o
         WHERE o.customer_id = $1
           AND o.in_cart = FALSE
           AND LOWER(o.order_status) = ANY($2)`,
				[id, historyStatuses.map((s) => s.toLowerCase())]
			)

			const totalOrders = parseInt(countResult.rows[0].total, 10)

			return res.status(200).json({
				page: Number(page),
				limit: Number(limit),
				total: totalOrders,
				totalPages: Math.ceil(totalOrders / limit),
				data: orders,
			})
		}

		// Default behaviour (no segment): keep existing implementation for backwards compatibility
		const result = await pool.query(
			`SELECT o.*, 
              o.payment_method,
              c.concession_name, 
              caf.cafeteria_name,
              COALESCE(c.gcash_payment_available, FALSE) AS gcash_payment_available,
              COALESCE(c.oncounter_payment_available, FALSE) AS oncounter_payment_available,
              (
                SELECT ARRAY(
                  SELECT m.item_name
                  FROM tblorderdetail d
                  JOIN tblmenuitem m ON d.item_id = m.id
                  WHERE d.order_id = o.id
                  ORDER BY d.id
                  LIMIT 3
                )
              ) AS item_names_preview,
              (
                SELECT COUNT(*)::int FROM tblorderdetail d2 WHERE d2.order_id = o.id
              ) AS item_count,
              -- Convert UTC to Asia/Manila and add 8 hours
              (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as created_at,
              (o.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as updated_at,
              (o.accepted_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as accepted_at,
              (o.payment_receipt_expires_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as payment_receipt_expires_at,
              (o.schedule_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as schedule_time
       FROM tblorder o
       JOIN tblconcession c ON o.concession_id = c.id
       JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
       WHERE o.customer_id = $1
         AND o.in_cart = FALSE   -- ✅ only checked-out orders
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
			[id, limit, offset]
		)

		const orders = result.rows.map((order) => {
			order.payment_proof = makeImageDataUrl(order.gcash_screenshot)
			return order
		})

		// Get total count for frontend pagination
		const countResult = await pool.query(
			`SELECT COUNT(*) AS total
       FROM tblorder o
       WHERE o.customer_id = $1
         AND o.in_cart = FALSE`,
			[id]
		)

		const totalOrders = parseInt(countResult.rows[0].total, 10)

		return res.status(200).json({
			page: Number(page),
			limit: Number(limit),
			total: totalOrders,
			totalPages: Math.ceil(totalOrders / limit),
			data: orders,
		})
	} catch (err) {
		console.error('Error fetching customer orders:', err)
		res.status(500).json({ error: 'Failed to fetch customer orders' })
	}
}

export const getOrderById = async (req, res) => {
	const { id } = req.params // order ID

	try {
		// Get main order info with customer and concession details, including payment flags
		const orderResult = await pool.query(
			`SELECT o.*, 
              customer.first_name AS customer_first_name, 
              customer.last_name AS customer_last_name, 
              customer.email AS customer_email, 
              customer.profile_image AS customer_profile_image,
              concessionaire.first_name AS concessionaire_first_name,
              concessionaire.last_name AS concessionaire_last_name,
              concessionaire.email AS concessionaire_email,
              concessionaire.profile_image AS concessionaire_profile_image,
              concessionaire.contact_number AS concessionaire_contact_number,
              concessionaire.messenger_link AS concessionaire_messenger_link,
              c.concession_name,
              c.gcash_number,
              c.receipt_timer,
              c.image AS concession_image,
              caf.cafeteria_name,
              caf.location AS cafeteria_location,
              COALESCE(c.gcash_payment_available, FALSE) AS gcash_payment_available,
              COALESCE(c.oncounter_payment_available, FALSE) AS oncounter_payment_available,
              (
                SELECT od.dining_option
                FROM tblorderdetail od
                WHERE od.order_id = o.id
                ORDER BY od.id
                LIMIT 1
              ) AS dining_option,
              -- Convert UTC to Asia/Manila and add 8 hours
              (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as created_at,
              (o.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as updated_at,
              (o.accepted_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as accepted_at,
              (o.payment_receipt_expires_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as payment_receipt_expires_at,
              (o.schedule_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' + INTERVAL '8 hours') as schedule_time
       FROM tblorder o
       JOIN tbluser customer ON o.customer_id = customer.id
       JOIN tblconcession c ON o.concession_id = c.id
       JOIN tbluser concessionaire ON c.concessionaire_id = concessionaire.id
       JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
       WHERE o.id = $1`,
			[id]
		)

		if (orderResult.rowCount === 0) {
			return res.status(404).json({ error: 'Order not found' })
		}

		const order = orderResult.rows[0]

		// Convert images to base64
		order.customer_profile_image = makeImageDataUrl(
			order.customer_profile_image
		)
		order.concessionaire_profile_image_url = makeImageDataUrl(
			order.concessionaire_profile_image
		)
		order.concession_image_url = makeImageDataUrl(order.concession_image)
		order.gcash_screenshot = makeImageDataUrl(order.gcash_screenshot)
		order.payment_proof = order.gcash_screenshot || null

		// Clean up raw buffers not needed on frontend
		delete order.concession_image
		delete order.concessionaire_profile_image

		// Get order items
		const itemsResult = await pool.query(
			`SELECT od.*, m.item_name, m.price AS base_price
       FROM tblorderdetail od
       JOIN tblmenuitem m ON od.item_id = m.id
       WHERE od.order_id = $1`,
			[id]
		)

		const items = itemsResult.rows

		// For each item, get variations with quantities (supports new quantity column)
		for (let item of items) {
			const variationsResult = await pool.query(
				`SELECT iv.id, iv.variation_name, iv.additional_price, ivg.variation_group_name,
                SUM(COALESCE(oiv.quantity, 1))::int AS quantity
         FROM tblorderitemvariation oiv
         JOIN tblitemvariation iv ON oiv.variation_id = iv.id
         JOIN tblitemvariationgroup ivg ON iv.item_variation_group_id = ivg.id
         WHERE oiv.order_detail_id = $1
         GROUP BY iv.id, iv.variation_name, iv.additional_price, ivg.variation_group_name`,
				[item.id]
			)
			item.variations = variationsResult.rows
		}

		order.items = items

		res.json(order)
	} catch (err) {
		console.error('Error fetching order by ID:', err)
		res.status(500).json({ error: 'Failed to fetch order' })
	}
}

// ==========================
// Update order status
// ==========================
export const updateOrderStatus = async (req, res) => {
	const { id } = req.params
	const {
		order_status,
		decline_reason,
		updated_total_price,
		price_change_reason,
	} = req.body

	try {
		// Check if trying to mark as ready/completed and GCash timer has expired
		if (order_status === 'ready for pickup' || order_status === 'ready-for-pickup' || order_status === 'completed') {
			const orderCheck = await pool.query(
				`SELECT o.payment_method, o.order_status, o.accepted_at, o.gcash_screenshot, c.receipt_timer, o.payment_receipt_expires_at
				 FROM tblorder o
				 JOIN tblconcession c ON o.concession_id = c.id
				 WHERE o.id = $1`,
				[id]
			)

			if (orderCheck.rowCount > 0) {
				const order = orderCheck.rows[0]
				
				// Only check for GCash orders that are currently accepted without receipt
				if (
					order.payment_method === 'gcash' &&
					order.order_status === 'accepted' &&
					!order.gcash_screenshot
				) {
					let deadlineMs = null
					if (order.payment_receipt_expires_at) {
						const expiresDate = new Date(order.payment_receipt_expires_at)
						if (!Number.isNaN(expiresDate.getTime())) {
							deadlineMs = expiresDate.getTime()
						}
					}

					if (deadlineMs === null && order.accepted_at && order.receipt_timer) {
						const acceptedDate = new Date(order.accepted_at)
						const [hours, minutes, seconds] = order.receipt_timer
							.split(':')
							.map(Number)
						deadlineMs =
							acceptedDate.getTime() +
							(hours * 3600 + minutes * 60 + seconds) * 1000
					}

					if (deadlineMs !== null && Date.now() > deadlineMs) {
						return res.status(400).json({
							error: 'Cannot mark order as ready/completed: GCash receipt upload time has expired. Please decline this order.',
							currentStatus: order.order_status,
							timerExpired: true,
						})
					}
				}
			}
		}

		let query, params

		if (order_status === 'declined' && decline_reason) {
			// Update with decline reason
			query = `UPDATE tblorder 
               SET order_status = $1, decline_reason = $2, updated_at = NOW() AT TIME ZONE 'UTC'
               WHERE id = $3 RETURNING *`
      params = [order_status, decline_reason, id]
    } else {
      // Optional price adjustment when accepting an order
      const hasUpdatedTotalRaw =
        updated_total_price !== undefined &&
        updated_total_price !== null &&
        updated_total_price !== ''
      const updatedTotal = hasUpdatedTotalRaw
        ? Number(updated_total_price)
        : null

      if (
        order_status === 'accepted' &&
        updatedTotal !== null &&
        !Number.isNaN(updatedTotal)
      ) {
        query = `UPDATE tblorder o
                 SET order_status = $1,
                     updated_total_price = $2,
                     price_change_reason = $3,
                     accepted_at = NOW() AT TIME ZONE 'UTC',
                     payment_receipt_expires_at = NOW() AT TIME ZONE 'UTC' + (
                       SELECT c.receipt_timer::interval
                       FROM tblconcession c
                       WHERE c.id = o.concession_id
                     ),
                     updated_at = NOW() AT TIME ZONE 'UTC'
                 WHERE o.id = $4 RETURNING *`
        params = [order_status, updatedTotal, price_change_reason || null, id]
      } else if (order_status === 'accepted') {
        // Accepting without price change
        query = `UPDATE tblorder o
                 SET order_status = $1,
                     accepted_at = NOW() AT TIME ZONE 'UTC',
                     payment_receipt_expires_at = NOW() AT TIME ZONE 'UTC' + (
                       SELECT c.receipt_timer::interval
                       FROM tblconcession c
                       WHERE c.id = o.concession_id
                     ),
                     updated_at = NOW() AT TIME ZONE 'UTC'
                 WHERE o.id = $2 RETURNING *`
        params = [order_status, id]
      } else {
        // Update without decline reason or price change
        query = `UPDATE tblorder 
                 SET order_status = $1, updated_at = NOW() AT TIME ZONE 'UTC'
                 WHERE id = $2 RETURNING *`
        params = [order_status, id]
      }
    }

    const result = await pool.query(query, params)
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Order not found' })

    const order = result.rows[0]

    // Send notification to customer about order status change
    try {
      const concessionResult = await pool.query(
        `SELECT c.concession_name FROM tblconcession c WHERE c.id = $1`,
        [order.concession_id]
      )
      const concessionName = concessionResult.rows[0]?.concession_name || ''

      let oldTotal = null
      let newTotal = null
      let priceReason = ''

      if (
        order_status === 'accepted' &&
        order.updated_total_price !== null &&
        order.updated_total_price !== undefined &&
        !Number.isNaN(Number(order.updated_total_price)) &&
        !Number.isNaN(Number(order.total_price)) &&
        Number(order.updated_total_price) !== Number(order.total_price)
      ) {
        oldTotal = order.total_price
        newTotal = order.updated_total_price
        priceReason = order.price_change_reason || ''
      }

      await notifyOrderStatusChange(
        order.id,
        order.customer_id,
        order_status,
        concessionName,
        decline_reason,
        oldTotal,
        newTotal,
        priceReason
      )
    } catch (notifErr) {
      console.error('Error creating order status notification:', notifErr)
      // Don't fail the status update if notification fails
    }

    res.json(order)
  } catch (err) {
    console.error('Error updating order status:', err)
    res.status(500).json({ error: 'Failed to update order status' })
  }
}

export const updateOrderTotal = async (req, res) => {
	const { id } = req.params // order_id
	try {
		const query = `
	      UPDATE tblorder
	      SET total_price = (
	        SELECT COALESCE(SUM(od.total_price), 0)
	        FROM tblorderdetail od
	        WHERE od.order_id = $1
	      ),
	      updated_at = NOW() AT TIME ZONE 'UTC'
	      WHERE id = $1
	      RETURNING *;
	    `
		const result = await pool.query(query, [id])
		res.json(result.rows[0])
	} catch (err) {
		console.error('Error updating order total:', err)
		res.status(500).json({ error: 'Failed to update order total' })
	}
}

// ==========================
// Upload GCASH payment proof
// ==========================
export const updatePaymentProof = async (req, res) => {
	const { id } = req.params
	const file = req.file

	if (!file) return res.status(400).json({ error: 'No file uploaded' })

	try {
		// First check if the order exists and whether payment proof can be uploaded/updated
		const orderCheck = await pool.query(
			`SELECT o.order_status, o.gcash_screenshot, o.payment_method, o.accepted_at, c.receipt_timer, o.payment_receipt_expires_at
			 FROM tblorder o
			 JOIN tblconcession c ON o.concession_id = c.id
			 WHERE o.id = $1`,
			[id]
		)

		if (orderCheck.rowCount === 0) {
			return res.status(404).json({ error: 'Order not found' })
		}

		const order = orderCheck.rows[0]
		const orderStatus = order.order_status

		// Once an order is completed, the payment proof should no longer be changed
		if (orderStatus === 'completed') {
			return res.status(400).json({
					error:
						'Payment proof can no longer be changed because the order is completed',
					currentStatus: orderStatus,
			})
		}

		// For other states, keep the rule that upload is only allowed
		// after the order has been accepted or is ready for pickup
		if (orderStatus !== 'accepted' && orderStatus !== 'ready for pickup') {
			return res.status(400).json({
					error:
						'Payment proof can only be uploaded after the order has been accepted or is ready for pickup',
					currentStatus: orderStatus,
			})
		}

		// Check if receipt timer has expired for GCash orders
		if (order.payment_method === 'gcash' && orderStatus === 'accepted') {
			let deadlineMs = null
			if (order.payment_receipt_expires_at) {
				const expiresDate = new Date(order.payment_receipt_expires_at)
				if (!Number.isNaN(expiresDate.getTime())) {
					deadlineMs = expiresDate.getTime()
				}
			}

			if (deadlineMs === null && order.accepted_at && order.receipt_timer) {
				const acceptedDate = new Date(order.accepted_at)
				const [hours, minutes, seconds] = order.receipt_timer
					.split(':')
					.map(Number)
				deadlineMs =
					acceptedDate.getTime() +
					(hours * 3600 + minutes * 60 + seconds) * 1000
			}

			if (deadlineMs !== null && Date.now() > deadlineMs) {
				return res.status(400).json({
					error: 'Receipt upload time has expired. This order will be automatically declined.',
					currentStatus: orderStatus,
					timerExpired: true,
				})
			}
		}

		const result = await pool.query(
			`UPDATE tblorder 
	       SET gcash_screenshot = $1, updated_at = NOW() AT TIME ZONE 'UTC'
	       WHERE id = $2 RETURNING *`,
			[file.buffer, id]
		)

		const updatedOrder = result.rows[0]
		// Convert gcash_screenshot to base64 for frontend
		updatedOrder.payment_proof = makeImageDataUrl(updatedOrder.gcash_screenshot)

		res.json(updatedOrder)
	} catch (err) {
		console.error('Error uploading payment proof:', err)
		res.status(500).json({ error: 'Failed to upload payment proof' })
	}
}

export const updatePaymentMethod = async (req, res) => {
	const { id } = req.params
	const { payment_method } = req.body
	try {
		const result = await pool.query(
			`UPDATE tblorder
	       SET payment_method = $1, updated_at = NOW() AT TIME ZONE 'UTC'
	       WHERE id = $2
	       RETURNING *`,
			[payment_method, id]
		)
		if (result.rowCount === 0)
			return res.status(404).json({ error: 'Order not found' })
		res.json(result.rows[0])
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: 'Failed to update payment method' })
	}
}

// ==========================
// Reject receipt (concessionaire only)
// Clears the receipt screenshot and resets accepted_at to restart timer
// ==========================
export const rejectReceipt = async (req, res) => {
	const { id } = req.params

	try {
		// Check if order exists and is in accepted status
		const orderCheck = await pool.query(
			`SELECT order_status, payment_method FROM tblorder WHERE id = $1`,
			[id]
		)

		if (orderCheck.rowCount === 0) {
			return res.status(404).json({ error: 'Order not found' })
		}

		const { order_status, payment_method } = orderCheck.rows[0]

		// Only allow rejection for accepted GCash orders
		if (order_status !== 'accepted') {
			return res.status(400).json({
					error: 'Receipt can only be rejected for accepted orders',
			})
		}

		if (payment_method !== 'gcash') {
			return res.status(400).json({
					error: 'Receipt rejection only applies to GCash payments',
			})
		}

		// Clear screenshot and reset accepted_at (and receipt expiry) to restart timer
		const result = await pool.query(
			`UPDATE tblorder o
	             SET gcash_screenshot = NULL,
	                 accepted_at = NOW() AT TIME ZONE 'UTC',
	                 payment_receipt_expires_at = NOW() AT TIME ZONE 'UTC' + (
	                   SELECT c.receipt_timer::interval
	                   FROM tblconcession c
	                   WHERE c.id = o.concession_id
	                 ),
	                 updated_at = NOW() AT TIME ZONE 'UTC'
	             WHERE o.id = $1 
	             RETURNING *`,
			[id]
		)

		const order = result.rows[0]
		order.payment_proof = null

		res.json(order)
	} catch (err) {
		console.error('Error rejecting receipt:', err)
		res.status(500).json({ error: 'Failed to reject receipt' })
	}
}

// ==========================
// Auto-decline expired GCash receipt timer
// Checks if timer expired and auto-declines the order
// ==========================
export const checkAndDeclineExpiredReceipt = async (req, res) => {
	const { id } = req.params

	try {
		// Fetch order with receipt_timer from concession
		const result = await pool.query(
			`SELECT o.*, c.receipt_timer 
	       FROM tblorder o
	       JOIN tblconcession c ON o.concession_id = c.id
	       WHERE o.id = $1`,
			[id]
		)

		if (result.rowCount === 0) {
			return res.status(404).json({ error: 'Order not found' })
		}

		const order = result.rows[0]

		// Only check GCash orders that are accepted and don't have receipt
		if (
			order.payment_method !== 'gcash' ||
			order.order_status !== 'accepted' ||
			order.gcash_screenshot !== null
		) {
			return res.json({
				declined: false,
				message: 'Order does not need to be declined',
			})
		}

		// Determine deadline: prefer payment_receipt_expires_at, fall back to accepted_at + receipt_timer
		let deadlineMs = null
		if (order.payment_receipt_expires_at) {
			const expiresDate = new Date(order.payment_receipt_expires_at)
			if (!Number.isNaN(expiresDate.getTime())) {
				deadlineMs = expiresDate.getTime()
			}
		}

		if (deadlineMs === null) {
			// Fallback for older orders that may not have payment_receipt_expires_at set
			if (!order.accepted_at || !order.receipt_timer) {
				return res.json({ declined: false, message: 'Missing timer data' })
			}

			const acceptedDate = new Date(order.accepted_at)
			const [hours, minutes, seconds] = order.receipt_timer
				.split(':')
				.map(Number)
			deadlineMs =
				acceptedDate.getTime() +
				(hours * 3600 + minutes * 60 + seconds) * 1000
		}

		const now = Date.now()

		// If expired, auto-decline
		if (now >= deadlineMs) {
			await pool.query(
				`UPDATE tblorder 
	         SET order_status = 'declined', 
	             decline_reason = 'Order automatically declined: GCash receipt not uploaded within the required time.', 
	             updated_at = NOW() AT TIME ZONE 'UTC'
	         WHERE id = $1`,
				[id]
			)

			return res.json({
				declined: true,
				message: 'Order auto-declined due to expired receipt timer',
			})
		}

		return res.json({ declined: false, message: 'Timer not expired' })
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: 'Failed to check receipt timer' })
	}
}

// ==========================
// Add a new order
// ==========================
export const addOrder = async (req, res) => {
	const {
		customer_id,
		concession_id,
		dining_option,
		status,
		total_price,
		in_cart,
		payment_method,
	} = req.body
	try {
		// Validate concession is still available and open
		if (concession_id) {
			const concessionCheck = await pool.query(
				`SELECT concession_name, status, receipt_timer FROM tblconcession WHERE id = $1`,
				[concession_id]
			)

			if (concessionCheck.rowCount === 0) {
				return res.status(400).json({
					error: 'Concession unavailable',
					message:
						'This stall is no longer available. Please choose another concession.',
				})
			}

			const concession = concessionCheck.rows[0]
			if (concession.status && concession.status !== 'open') {
				return res.status(400).json({
					error: 'Concession closed',
					message: `${concession.concession_name} is currently closed and not accepting new orders.`,
				})
			}
		}

		if (in_cart) {
			const existing = await pool.query(
				`SELECT * FROM tblorder WHERE customer_id=$1 AND concession_id=$2 AND in_cart=TRUE LIMIT 1`,
				[customer_id, concession_id]
			)
			if (existing.rows.length > 0)
				return res.status(200).json(existing.rows[0])
		}

		const initialStatus = status || 'pending'

		let query
		let params

		// If an order is created already accepted with GCash, start the receipt timer immediately
		if (initialStatus === 'accepted' && payment_method === 'gcash') {
			query = `INSERT INTO tblorder (
				customer_id,
				concession_id,
				order_status,
				total_price,
				in_cart,
				payment_method,
				accepted_at,
				payment_receipt_expires_at
			) VALUES (
				$1,
				$2,
				$3,
				$4,
				$5,
				$6,
				NOW() AT TIME ZONE 'UTC',
				NOW() AT TIME ZONE 'UTC' + (
					SELECT c.receipt_timer::interval
					FROM tblconcession c
					WHERE c.id = $2
				)
			) RETURNING *`
			params = [
				customer_id,
				concession_id,
				initialStatus,
				total_price,
				in_cart ?? false,
				payment_method,
			]
		} else {
			query = `INSERT INTO tblorder (
				customer_id,
				concession_id,
				order_status,
				total_price,
				in_cart,
				payment_method
			) VALUES (
				$1,
				$2,
				$3,
				$4,
				$5,
				$6
			) RETURNING *`
			params = [
				customer_id,
				concession_id,
				initialStatus,
				total_price,
				in_cart ?? false,
				payment_method,
			]
		}

		const result = await pool.query(query, params)
		res.status(201).json(result.rows[0])
	} catch (err) {
		console.error('Error adding order:', err)
		res.status(500).json({ error: 'Failed to add order' })
	}
}

// Notify concessionaire for a given order (used for direct orders created from MenuItemDetails)
export const notifyConcessionaireForOrder = async (req, res) => {
	const { id } = req.params // order_id
	try {
		// Load order and concessionaire
		const orderRes = await pool.query(
			`SELECT customer_id, concession_id FROM tblorder WHERE id = $1`,
			[id]
		)
		if (orderRes.rowCount === 0)
			return res.status(404).json({ error: 'Order not found' })
		const order = orderRes.rows[0]

		const consRes = await pool.query(
			`SELECT concessionaire_id FROM tblconcession WHERE id = $1`,
			[order.concession_id]
		)
		if (consRes.rowCount === 0)
			return res.status(400).json({ error: 'Concession not found for order' })
		const concessionaireId = consRes.rows[0].concessionaire_id

		// Get customer name
		const custRes = await pool.query(
			`SELECT first_name, last_name FROM tbluser WHERE id = $1`,
			[order.customer_id]
		)
		const customer = custRes.rows[0] || { first_name: '', last_name: '' }
		const customerName = `${customer.first_name || ''} ${
			customer.last_name || ''
		}`.trim()

		// Item count
		const itemCountRes = await pool.query(
			`SELECT COUNT(*) AS count FROM tblorderdetail WHERE order_id = $1`,
			[id]
		)
		const itemCount = parseInt(itemCountRes.rows[0]?.count || '0', 10)

		await notifyNewOrder(Number(id), concessionaireId, customerName, itemCount)
		res.json({ success: true })
	} catch (err) {
		console.error('Error notifying concessionaire for order:', err)
		res.status(500).json({ error: 'Failed to notify concessionaire' })
	}
}

// ==========================
// Clean up invalid cart items (unavailable items or items from closed concessions)
// ==========================
export const cleanupInvalidCartItems = async (customerId) => {
	try {
		// First, get all cart items with their availability and concession status
		const checkQuery = `
      SELECT od.id AS order_detail_id, od.item_id, m.available, c.status as concession_status
      FROM tblorder o
      JOIN tblorderdetail od ON o.id = od.order_id
      JOIN tblmenuitem m ON od.item_id = m.id
      JOIN tblconcession c ON o.concession_id = c.id
      WHERE o.customer_id = $1 AND o.in_cart = TRUE
    `

		const checkResult = await pool.query(checkQuery, [customerId])

		// Find invalid items (unavailable or from closed concessions)
		const invalidItems = checkResult.rows.filter(
			(row) => !row.available || row.concession_status === 'closed'
		)

		if (invalidItems.length > 0) {
			const invalidOrderDetailIds = invalidItems.map(
				(item) => item.order_detail_id
			)

			// Delete order item variations for invalid items
			await pool.query(
				`DELETE FROM tblorderitemvariation 
         WHERE order_detail_id = ANY($1::int[])`,
				[invalidOrderDetailIds]
			)

			// Delete order details for invalid items
			await pool.query(
				`DELETE FROM tblorderdetail 
         WHERE id = ANY($1::int[])`,
				[invalidOrderDetailIds]
			)

			// Check if any orders are now empty and delete them
			const emptyOrdersQuery = `
        SELECT o.id as order_id
        FROM tblorder o
        LEFT JOIN tblorderdetail od ON o.id = od.order_id
        WHERE o.customer_id = $1 AND o.in_cart = TRUE AND od.id IS NULL
      `

			const emptyOrdersResult = await pool.query(emptyOrdersQuery, [customerId])

			if (emptyOrdersResult.rows.length > 0) {
				const emptyOrderIds = emptyOrdersResult.rows.map((row) => row.order_id)
				await pool.query(`DELETE FROM tblorder WHERE id = ANY($1::int[])`, [
					emptyOrderIds,
				])
			}

			console.log(
				`Cleaned up ${invalidItems.length} invalid cart items for customer ${customerId}`
			)
		}

		return invalidItems.length
	} catch (err) {
		console.error('Error cleaning up invalid cart items:', err)
		return 0
	}
}

// ==========================
// Get items in cart for a customer
// ==========================
export const getCartByCustomerId = async (req, res) => {
	const { id } = req.params // customer_id
	try {
		// First, clean up any invalid cart items
		await cleanupInvalidCartItems(id)

		const query = `
      SELECT o.id AS order_id,
             o.total_price,
             od.dining_option,
             od.id AS order_detail_id,
             od.quantity,
             od.total_price AS order_detail_total,
             m.item_name,
             m.price AS base_price,
             c.concession_name,
             caf.cafeteria_name,
             m.available,
             c.status as concession_status,
             ARRAY_AGG(iv.variation_name) FILTER (WHERE iv.id IS NOT NULL) AS variations
      FROM tblorder o
      JOIN tblorderdetail od ON o.id = od.order_id
      JOIN tblmenuitem m ON od.item_id = m.id
      JOIN tblconcession c ON o.concession_id = c.id
      JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
      LEFT JOIN tblorderitemvariation oiv ON od.id = oiv.order_detail_id
      LEFT JOIN tblitemvariation iv ON oiv.variation_id = iv.id
      WHERE o.customer_id = $1 AND o.in_cart = TRUE
        AND m.available = TRUE 
        AND c.status = 'open'
      GROUP BY o.id, od.id, m.item_name, m.price, c.concession_name, caf.cafeteria_name, od.dining_option, m.available, c.status
      ORDER BY o.created_at DESC;
    `
		const result = await pool.query(query, [id])
		res.json(result.rows)
	} catch (err) {
		console.error('Error fetching cart:', err)
		res.status(500).json({ error: 'Failed to fetch cart' })
	}
}

// ==========================
// Checkout (convert cart items to real orders)
// ==========================
export const checkoutCart = async (req, res) => {
	const { id } = req.params // customer_id
	const { schedule_time } = req.body // optional schedule_time from request body

	try {
		// First, clean up any invalid cart items before checkout
		const cleanedCount = await cleanupInvalidCartItems(id)

		if (cleanedCount > 0) {
			console.log(
				`Removed ${cleanedCount} invalid items before checkout for customer ${id}`
			)
		}

		// Validate schedule_time if provided
		if (schedule_time) {
			const scheduledDate = new Date(schedule_time)
			const now = new Date()

			if (scheduledDate <= now) {
				return res.status(400).json({
					error: 'Schedule time must be in the future',
				})
			}
		}

		// Update orders with schedule_time if provided
		const updateQuery = schedule_time
			? `UPDATE tblorder
         SET in_cart = FALSE, order_status = 'pending', schedule_time = $2, updated_at = NOW() AT TIME ZONE 'UTC'
         WHERE customer_id = $1 AND in_cart = TRUE
         RETURNING *`
			: `UPDATE tblorder
         SET in_cart = FALSE, order_status = 'pending', updated_at = NOW() AT TIME ZONE 'UTC'
         WHERE customer_id = $1 AND in_cart = TRUE
         RETURNING *`

		const params = schedule_time ? [id, schedule_time] : [id]
		const result = await pool.query(updateQuery, params)

		// Create notifications for concessionaires for each order
		console.log(`📦 Creating notifications for ${result.rows.length} orders`)

		for (const order of result.rows) {
			try {
				// Get concessionaire_id for this concession
				const concessionResult = await pool.query(
					`SELECT c.concessionaire_id, c.concession_name
           FROM tblconcession c
           WHERE c.id = $1`,
					[order.concession_id]
				)

				// Get customer name
				const customerResult = await pool.query(
					`SELECT first_name, last_name FROM tbluser WHERE id = $1`,
					[id]
				)

				if (
					concessionResult.rows.length > 0 &&
					customerResult.rows.length > 0
				) {
					const concessionaireId = concessionResult.rows[0].concessionaire_id
					const customer = customerResult.rows[0]
					const customerName = `${customer.first_name} ${customer.last_name}`

					// Get order item count
					const itemCountResult = await pool.query(
						`SELECT COUNT(*) as count FROM tblorderdetail WHERE order_id = $1`,
						[order.id]
					)
					const itemCount = parseInt(itemCountResult.rows[0].count)

					// Create notification for concessionaire
					await notifyNewOrder(
						order.id,
						concessionaireId,
						customerName,
						itemCount
					)
				}
			} catch (notifErr) {
				console.error('Error creating notification:', notifErr)
				// Don't fail the checkout if notification fails
			}
		}

		console.log('✅ Notification creation complete')

		let message = 'Checkout successful'
		if (schedule_time) {
			message += ` - Scheduled for ${new Date(schedule_time).toLocaleString()}`
		}

		res.json({
			message,
			orders: result.rows,
			cleanedItems:
				cleanedCount > 0
					? `${cleanedCount} invalid items were removed before checkout`
					: null,
		})
	} catch (err) {
		console.error('Error during checkout:', err)
		res.status(500).json({ error: 'Checkout failed' })
	}
}

// ==========================
// Checkout single order (by order_id)
// ==========================
export const checkoutSingleOrder = async (req, res) => {
	const { order_id, schedule_time } = req.body

	try {
		// Validate schedule_time if provided
		if (schedule_time) {
			const scheduledDate = new Date(schedule_time)
			const now = new Date()

			if (scheduledDate <= now) {
				return res.status(400).json({
					error: 'Schedule time must be in the future',
				})
			}
		}

		// Update single order with schedule_time if provided
		const updateQuery = schedule_time
			? `UPDATE tblorder
         SET in_cart = FALSE, order_status = 'pending', schedule_time = $2, updated_at = NOW() AT TIME ZONE 'UTC'
         WHERE id = $1 AND in_cart = TRUE
         RETURNING *`
			: `UPDATE tblorder
         SET in_cart = FALSE, order_status = 'pending', updated_at = NOW() AT TIME ZONE 'UTC'
         WHERE id = $1 AND in_cart = TRUE
         RETURNING *`

		const params = schedule_time ? [order_id, schedule_time] : [order_id]
		const result = await pool.query(updateQuery, params)

		if (result.rows.length === 0) {
			return res
				.status(404)
				.json({ error: 'Order not found or already checked out' })
		}

		const order = result.rows[0]

		// Create notification for concessionaire
		try {
			// Get concessionaire_id for this concession
			const concessionResult = await pool.query(
				`SELECT c.concessionaire_id, c.concession_name
         FROM tblconcession c
         WHERE c.id = $1`,
				[order.concession_id]
			)

			// Get customer name
			const customerResult = await pool.query(
				`SELECT first_name, last_name FROM tbluser WHERE id = $1`,
				[order.customer_id]
			)

			if (concessionResult.rows.length > 0 && customerResult.rows.length > 0) {
				const concessionaireId = concessionResult.rows[0].concessionaire_id
				const customer = customerResult.rows[0]
				const customerName = `${customer.first_name} ${customer.last_name}`

				// Get order item count
				const itemCountResult = await pool.query(
					`SELECT COUNT(*) as count FROM tblorderdetail WHERE order_id = $1`,
					[order.id]
				)
				const itemCount = parseInt(itemCountResult.rows[0].count)

				// Create notification for concessionaire
				await notifyNewOrder(
					order.id,
					concessionaireId,
					customerName,
					itemCount
				)
			}
		} catch (notifErr) {
			console.error('Error creating notification:', notifErr)
			// Don't fail the checkout if notification fails
		}

		let message = 'Order placed successfully'
		if (schedule_time) {
			message += ` - Scheduled for ${new Date(schedule_time).toLocaleString()}`
		}

		res.json({
			message,
			order,
		})
	} catch (err) {
		console.error('Error during checkout:', err)
		res.status(500).json({ error: 'Checkout failed' })
	}
}

// ==========================
// Delete an order
// ==========================
export const deleteOrder = async (req, res) => {
	const { id } = req.params
	try {
		const result = await pool.query(
			`DELETE FROM tblorder WHERE id = $1 RETURNING *`,
			[id]
		)
		if (result.rowCount === 0)
			return res.status(404).json({ error: 'Order not found' })
		res.json({ message: 'Order deleted successfully' })
	} catch (err) {
		console.error('Error deleting order:', err)
		res.status(500).json({ error: 'Failed to delete order' })
	}
}

// ==========================
// Cancel order (customer only)
// ==========================
export const cancelOrder = async (req, res) => {
	const { id } = req.params
	const customerId = req.user.id // from auth middleware

	try {
		// First, check if the order exists and belongs to the customer
		const orderResult = await pool.query(
			`SELECT id, order_status, customer_id 
       FROM tblorder 
       WHERE id = $1 AND customer_id = $2`,
			[id, customerId]
		)

		if (orderResult.rowCount === 0) {
			return res.status(404).json({
				error:
					"Order not found or you don't have permission to cancel this order",
			})
		}

		const order = orderResult.rows[0]

		// Only allow cancellation if order is still pending (not yet accepted)
		if (order.order_status !== 'pending') {
			return res.status(400).json({
				error:
					'Order cannot be cancelled. Only pending orders can be cancelled.',
			})
		}

		// Update order status to cancelled
		const updateResult = await pool.query(
			`UPDATE tblorder 
       SET order_status = 'cancelled', updated_at = NOW() AT TIME ZONE 'UTC'
       WHERE id = $1`,
			[id]
		)

		// Notify concessionaire about cancellation
		try {
			const consResult = await pool.query(
				`SELECT c.concessionaire_id FROM tblorder o JOIN tblconcession c ON o.concession_id = c.id WHERE o.id = $1`,
				[id]
			)
			const userRes = await pool.query(
				`SELECT first_name, last_name FROM tbluser WHERE id = $1`,
				[customerId]
			)
			if (consResult.rows.length && userRes.rows.length) {
				const concessionaireId = consResult.rows[0].concessionaire_id
				const customer = userRes.rows[0]
				const customerName =
					`${customer.first_name} ${customer.last_name}`.trim()
				await notifyOrderCancelledForConcessionaire(
					id,
					concessionaireId,
					customerName
				)
			}
		} catch (notifyErr) {
			console.error(
				'Error notifying concessionaire about cancellation:',
				notifyErr
			)
		}

		res.json({
			message: 'Order cancelled successfully',
			order: updateResult.rows[0],
		})
	} catch (err) {
		console.error('Error cancelling order:', err)
		res.status(500).json({ error: 'Failed to cancel order' })
	}
}
