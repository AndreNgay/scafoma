// controllers/menuItemController.js
import { pool } from '../libs/database.js'
import multer from 'multer'

const storage = multer.memoryStorage()
export const upload = multer({ storage })

// Helper: convert BYTEA image to base64 data URL
const makeImageDataUrl = (imageBuffer, mime = 'jpeg') => {
	if (!imageBuffer) return null
	const base64 = Buffer.from(imageBuffer).toString('base64')
	return `data:image/${mime};base64,${base64}`
}

// Helper: parse data URL (data:image/...;base64,...) into a Buffer
// Used to automatically clone images when variations are imported
const parseImageDataUrlToBuffer = (dataUrl) => {
	if (!dataUrl || typeof dataUrl !== 'string') return null

	// Only handle data URLs; ignore file paths or http URLs
	const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
	if (!match) return null

	const base64 = match[2]
	try {
		return Buffer.from(base64, 'base64')
	} catch (err) {
		console.error('Failed to parse image data URL:', err)
		return null
	}
}

// Helper: parse boolean safely
const parseBool = (val) => {
	if (typeof val === 'boolean') return val
	if (typeof val === 'string') return val.toLowerCase() === 'true'
	return false
}

// =========================
// Get all menu items (with optional filters, pagination, sorting)
// =========================
export const getMenuItems = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1
		const limit = parseInt(req.query.limit) || 10
		const offset = (page - 1) * limit

		const { cafeteriaId, concessionId, category, sortBy, search } = req.query

		let whereClauses = ['mi.available = TRUE', "c.status = 'open'"]
		let params = []
		let i = 1

		if (cafeteriaId) {
			whereClauses.push(`c.cafeteria_id = $${i++}`)
			params.push(cafeteriaId)
		}
		if (concessionId) {
			whereClauses.push(`mi.concession_id = $${i++}`)
			params.push(concessionId)
		}
		if (category) {
			whereClauses.push(`mi.category ILIKE $${i++}`)
			params.push(`%${category}%`)
		}
		if (search) {
			whereClauses.push(`mi.item_name ILIKE $${i++}`)
			params.push(`%${search}%`)
		}

		const whereSQL = whereClauses.length
			? 'WHERE ' + whereClauses.join(' AND ')
			: ''

		let orderBy = 'mi.created_at DESC'
		if (sortBy === 'price_asc') orderBy = 'mi.price ASC'
		if (sortBy === 'price_desc') orderBy = 'mi.price DESC'
		if (sortBy === 'name') orderBy = 'mi.item_name ASC'

		// Get total count
		const countResult = await pool.query(
			`SELECT COUNT(*) FROM tblmenuitem mi 
       JOIN tblconcession c ON mi.concession_id = c.id
       ${whereSQL}`,
			params
		)
		const total = parseInt(countResult.rows[0].count)

		// Get menu items
		const result = await pool.query(
			`SELECT mi.*, c.concession_name, c.gcash_payment_available, c.oncounter_payment_available,
              caf.cafeteria_name, caf.id AS cafeteria_id
       FROM tblmenuitem mi
       JOIN tblconcession c ON mi.concession_id = c.id
       JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
       ${whereSQL}
       ORDER BY ${orderBy}
       LIMIT $${i} OFFSET $${i + 1}`,
			[...params, limit, offset]
		)

		const menuItems = result.rows

		// Fetch variations with group constraints (to allow constrained price ranges on clients)
		const menuItemIds = menuItems.map((mi) => mi.id)
		let variationsMap = {}
		if (menuItemIds.length > 0) {
			const vRes = await pool.query(
				`SELECT ivg.id AS group_id, ivg.menu_item_id,
                ivg.variation_group_name AS label,
                ivg.min_selection, ivg.max_selection,
                iv.variation_name, iv.additional_price, iv.max_amount, iv.id AS variation_id, iv.available
         FROM tblitemvariationgroup ivg
         LEFT JOIN tblitemvariation iv 
           ON iv.item_variation_group_id = ivg.id
          AND iv.available = TRUE
         WHERE ivg.menu_item_id = ANY($1::int[])`,
				[menuItemIds]
			)

			for (const v of vRes.rows) {
				if (!variationsMap[v.menu_item_id]) variationsMap[v.menu_item_id] = {}
				if (!variationsMap[v.menu_item_id][v.label]) {
					variationsMap[v.menu_item_id][v.label] = {
						label: v.label,
						// derived booleans for compatibility if clients still read them
						required_selection: (v.min_selection || 0) > 0,
						multiple_selection: (v.max_selection || 1) > 1,
						min_selection: v.min_selection || 0,
						max_selection: v.max_selection,
						variations: [],
					}
				}
				if (v.variation_name) {
					variationsMap[v.menu_item_id][v.label].variations.push({
						name: v.variation_name,
						price: Number(v.additional_price),
						max_amount: v.max_amount || 1,
						variation_id: v.variation_id,
						available: v.available !== false,
					})
				}
			}
		}

		// Fetch feedback aggregates (avg and count) per menu item
		let feedbackMap = {}
		if (menuItemIds.length > 0) {
			const fbRes = await pool.query(
				`SELECT menu_item_id, COUNT(*) AS feedback_count, AVG(rating) AS avg_rating
         FROM tblfeedback
         WHERE menu_item_id = ANY($1::int[])
         GROUP BY menu_item_id`,
				[menuItemIds]
			)
			for (const row of fbRes.rows) {
				feedbackMap[row.menu_item_id] = {
					feedback_count: Number(row.feedback_count),
					avg_rating: row.avg_rating !== null ? Number(row.avg_rating) : null,
				}
			}
		}

		// Fetch total ordered counts per menu item
		let orderCountMap = {}
		if (menuItemIds.length > 0) {
			const ocRes = await pool.query(
				`SELECT od.item_id AS menu_item_id, COALESCE(SUM(od.quantity), 0) AS total_ordered
         FROM tblorderdetail od
         WHERE od.item_id = ANY($1::int[])
         GROUP BY od.item_id`,
				[menuItemIds]
			)
			for (const row of ocRes.rows) {
				orderCountMap[row.menu_item_id] = Number(row.total_ordered)
			}
		}

		// Format response
		const formattedItems = menuItems.map((r) => ({
			id: r.id,
			item_name: r.item_name,
			price: Number(r.price),
			category: r.category,
			availability: r.available,
			concession_name: r.concession_name,
			concession_id: r.concession_id,
			cafeteria_id: r.cafeteria_id,
			cafeteria_name: r.cafeteria_name,
			image_url: makeImageDataUrl(r.image),
			feedback: feedbackMap[r.id] || { feedback_count: 0, avg_rating: null },
			order_count: orderCountMap[r.id] || 0,
			variations: variationsMap[r.id] ? Object.values(variationsMap[r.id]) : [],
			gcash_payment_available: r.gcash_payment_available,
			oncounter_payment_available: r.oncounter_payment_available,
		}))

		res.json({
			status: 'success',
			data: formattedItems,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({ status: 'failed', message: 'Server error' })
	}
}

// controllers/menuItemController.js
export const getMenuItemsByAdmin = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1
		const limit = parseInt(req.query.limit) || 50 // default 50 items per page for admin
		const offset = (page - 1) * limit
		const { search, category, sortBy } = req.query

		let whereClauses = []
		let params = []
		let i = 1

		if (category) {
			whereClauses.push(`mi.category ILIKE $${i++}`)
			params.push(`%${category}%`)
		}

		if (search) {
			whereClauses.push(`mi.item_name ILIKE $${i++}`)
			params.push(`%${search}%`)
		}

		const whereSQL = whereClauses.length
			? 'WHERE ' + whereClauses.join(' AND ')
			: ''

		let orderBy = 'mi.created_at DESC'
		if (sortBy === 'price_asc') orderBy = 'mi.price ASC'
		if (sortBy === 'price_desc') orderBy = 'mi.price DESC'
		if (sortBy === 'name') orderBy = 'mi.item_name ASC'

		// Get total count
		const countResult = await pool.query(
			`SELECT COUNT(*) FROM tblmenuitem mi
       JOIN tblconcession c ON mi.concession_id = c.id
       JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
       ${whereSQL}`,
			params
		)
		const total = parseInt(countResult.rows[0].count)

		// Get menu items
		const result = await pool.query(
			`SELECT mi.*, c.concession_name, caf.cafeteria_name
       FROM tblmenuitem mi
       JOIN tblconcession c ON mi.concession_id = c.id
       JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
       ${whereSQL}
       ORDER BY ${orderBy}
       LIMIT $${i} OFFSET $${i + 1}`,
			[...params, limit, offset]
		)

		const menuItems = result.rows

		// Fetch variations
		const menuItemIds = menuItems.map((mi) => mi.id)
		let variationsMap = {}
		if (menuItemIds.length > 0) {
			const vRes = await pool.query(
				`SELECT ivg.menu_item_id, ivg.variation_group_name AS label,
                iv.variation_name, iv.additional_price
         FROM tblitemvariation iv
         JOIN tblitemvariationgroup ivg ON iv.item_variation_group_id = ivg.id
         WHERE ivg.menu_item_id = ANY($1::int[])`,
				[menuItemIds]
			)

			for (const v of vRes.rows) {
				if (!variationsMap[v.menu_item_id]) variationsMap[v.menu_item_id] = {}
				if (!variationsMap[v.menu_item_id][v.label])
					variationsMap[v.menu_item_id][v.label] = []
				variationsMap[v.menu_item_id][v.label].push({
					name: v.variation_name,
					price: Number(v.additional_price),
				})
			}
		}

		// Format response
		const formattedItems = menuItems.map((r) => ({
			id: r.id,
			item_name: r.item_name,
			price: Number(r.price),
			category: r.category,
			availability: r.available,
			concession_name: r.concession_name,
			concession_id: r.concession_id,
			cafeteria_name: r.cafeteria_name,
			image_url: r.image
				? `data:image/jpeg;base64,${r.image.toString('base64')}`
				: null,
			variations: variationsMap[r.id]
				? Object.keys(variationsMap[r.id]).map((label) => ({
						label,
						variations: variationsMap[r.id][label],
				  }))
				: [],
		}))

		res.json({
			status: 'success',
			data: formattedItems,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({ status: 'failed', message: 'Server error' })
	}
}

// =========================
// Get menu items by concessionaire
// =========================
export const getMenuItemsByConcessionaire = async (req, res) => {
	const concessionaireId = req.user.id
	try {
		const page = parseInt(req.query.page) || 1
		const limit = parseInt(req.query.limit) || 10
		const offset = (page - 1) * limit

		const { category, search, sortBy } = req.query

		let whereClauses = [`c.concessionaire_id = $1`]
		let params = [concessionaireId]
		let i = 2

		if (category) {
			whereClauses.push(`mi.category ILIKE $${i++}`)
			params.push(`%${category}%`)
		}
		if (search) {
			whereClauses.push(`mi.item_name ILIKE $${i++}`)
			params.push(`%${search}%`)
		}

		const whereSQL = whereClauses.length
			? 'WHERE ' + whereClauses.join(' AND ')
			: ''

		let orderBy = 'mi.created_at DESC'
		if (sortBy === 'price_asc') orderBy = 'mi.price ASC'
		if (sortBy === 'price_desc') orderBy = 'mi.price DESC'
		if (sortBy === 'name') orderBy = 'mi.item_name ASC'

		const countResult = await pool.query(
			`SELECT COUNT(*) FROM tblmenuitem mi
       JOIN tblconcession c ON mi.concession_id = c.id
       ${whereSQL}`,
			params
		)
		const total = parseInt(countResult.rows[0].count)

		const result = await pool.query(
			`SELECT mi.*, c.concession_name, caf.cafeteria_name
       FROM tblmenuitem mi
       JOIN tblconcession c ON mi.concession_id = c.id
       JOIN tblcafeteria caf ON c.cafeteria_id = caf.id
       ${whereSQL}
       ORDER BY ${orderBy}
       LIMIT $${i} OFFSET $${i + 1}`,
			[...params, limit, offset]
		)

		const menuItems = result.rows

		const menuItemIds = menuItems.map((mi) => mi.id)
		let variationsMap = {}
		if (menuItemIds.length > 0) {
			const vRes = await pool.query(
				`SELECT ivg.id AS group_id, ivg.menu_item_id, 
                ivg.variation_group_name AS label,
                ivg.min_selection, ivg.max_selection,
                iv.variation_name, iv.additional_price, iv.image, iv.max_amount, iv.id AS variation_id, iv.available
        FROM tblitemvariationgroup ivg
        LEFT JOIN tblitemvariation iv 
          ON iv.item_variation_group_id = ivg.id
         AND iv.available = TRUE
        WHERE ivg.menu_item_id = ANY($1::int[])`,
				[menuItemIds]
			)

			for (const v of vRes.rows) {
				if (!variationsMap[v.menu_item_id]) variationsMap[v.menu_item_id] = {}
				if (!variationsMap[v.menu_item_id][v.label]) {
					variationsMap[v.menu_item_id][v.label] = {
						label: v.label,
						required_selection: (v.min_selection || 0) > 0,
						multiple_selection: (v.max_selection || 1) > 1,
						min_selection: v.min_selection || 0,
						max_selection: v.max_selection,
						variations: [],
					}
				}
				if (v.variation_name) {
					variationsMap[v.menu_item_id][v.label].variations.push({
						name: v.variation_name,
						price: Number(v.additional_price),
						image_url: makeImageDataUrl(v.image),
						max_amount: v.max_amount || 1,
						variation_id: v.variation_id,
						available: v.available !== false,
					})
				}
			}
		}

		const formattedItems = menuItems.map((r) => ({
			id: r.id,
			item_name: r.item_name,
			price: Number(r.price),
			category: r.category,
			availability: r.available,
			concession_name: r.concession_name,
			concession_id: r.concession_id,
			cafeteria_name: r.cafeteria_name,
			image_url: makeImageDataUrl(r.image),
			variations: variationsMap[r.id] ? Object.values(variationsMap[r.id]) : [],
			gcash_payment_available: r.gcash_payment_available,
			oncounter_payment_available: r.oncounter_payment_available,
		}))

		res.json({
			status: 'success',
			data: formattedItems,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({ status: 'failed', message: 'Server error' })
	}
}

// =========================
// Add new menu item
// =========================
export const addMenuItem = async (req, res) => {
	const client = await pool.connect()
	try {
		const { item_name, price, category, availability, variations } = req.body

		if (!item_name) {
			return res
				.status(400)
				.json({ status: 'failed', message: 'Item name is required' })
		}

		// Assume concession_id comes from the authenticated user’s concessionaire account
		const concessionaireId = req.user?.id
		if (!concessionaireId) {
			return res.status(403).json({ status: 'failed', message: 'Unauthorized' })
		}

		const concessionResult = await pool.query(
			'SELECT id FROM tblconcession WHERE concessionaire_id = $1 LIMIT 1',
			[concessionaireId]
		)
		if (concessionResult.rows.length === 0) {
			return res
				.status(400)
				.json({
					status: 'failed',
					message: 'Concession not found for this user',
				})
		}
		const concessionId = concessionResult.rows[0].id

		// Handle image (stored as BYTEA)
		let imageBuffer = null
		if (req.file) {
			imageBuffer = req.file.buffer
		}

		await client.query('BEGIN')

		// Insert menu item
		const insertMenuItem = await client.query(
			`INSERT INTO tblmenuitem 
        (concession_id, item_name, price, category, available, image, created_at) 
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       RETURNING id`,
			[
				concessionId,
				item_name.trim(),
				Number(price) || 0,
				category || null,
				parseBool(availability),
				imageBuffer,
			]
		)

		const menuItemId = insertMenuItem.rows[0].id

		// Handle variations (if provided)
		if (variations) {
			let parsed
			try {
				parsed = JSON.parse(variations)
			} catch (err) {
				parsed = []
			}

			for (const group of parsed) {
				const allVariations = Array.isArray(group.variations)
					? group.variations
					: []
				const availableVariations = allVariations.filter(
					(v) => v.available !== false
				)
				const availableCount = availableVariations.length
				let minSel = Number(group.min_selection ?? 0) || 0
				let maxSel = Number(group.max_selection ?? 1) || 1
				if (availableCount > 0) {
					if (maxSel > availableCount) maxSel = availableCount
					if (minSel > maxSel) minSel = maxSel
				}

				const groupRes = await client.query(
					`INSERT INTO tblitemvariationgroup 
            (menu_item_id, variation_group_name, min_selection, max_selection)
           VALUES ($1,$2,$3,$4)
           RETURNING id`,
					[menuItemId, group.label, minSel, maxSel]
				)

				const groupId = groupRes.rows[0].id

				for (const v of group.variations || []) {
					const avail =
						typeof v.available === 'boolean'
							? v.available
							: typeof v.available === 'string'
							? v.available.toLowerCase() === 'true'
							: true // default to true when undefined/null

					let maxAmount = null
					if (typeof v.max_amount === 'number') {
						maxAmount = v.max_amount > 0 ? v.max_amount : null
					} else if (typeof v.max_amount === 'string') {
						const trimmed = v.max_amount.trim()
						if (trimmed) {
							const parsed = parseInt(trimmed, 10)
							maxAmount = parsed > 0 ? parsed : null
						}
					}

					// If image_url is a data URL, decode it so imported variations clone their images
					let imageBuffer = null
					if (v.image_url) {
						imageBuffer = parseImageDataUrlToBuffer(v.image_url)
					}

					await client.query(
						`INSERT INTO tblitemvariation 
              (item_variation_group_id, variation_name, additional_price, max_amount, available, image)
             VALUES ($1,$2,$3,$4,$5,$6)`,
						[
							groupId,
							v.name,
							Number(v.price) || 0,
							maxAmount,
							avail,
							imageBuffer,
						]
					)
				}
			}
		}

		await client.query('COMMIT')

		res.status(201).json({
			status: 'success',
			message: 'Menu item created successfully',
			data: { id: menuItemId },
		})
	} catch (err) {
		await client.query('ROLLBACK')
		console.error(err)
		res.status(500).json({ status: 'failed', message: 'Server error' })
	} finally {
		client.release()
	}
}

// =========================
// Update menu item
// =========================
export const updateMenuItem = async (req, res) => {
	const { id } = req.params
	const concessionaireId = req.user.id
	const { item_name, price, category } = req.body
	let availability = undefined
	if (typeof req.body.availability !== 'undefined') {
		const v = req.body.availability
		availability =
			v === 'true' || v === '1'
				? true
				: v === 'false' || v === '0'
				? false
				: null
	}

	let variations = []
	if (req.body.variations) {
		try {
			variations = JSON.parse(req.body.variations)
		} catch {
			return res
				.status(400)
				.json({ status: 'failed', message: 'Invalid variations JSON' })
		}
	}

	const imageData = req.file ? req.file.buffer : null
	const client = await pool.connect()

	try {
		await client.query('BEGIN')

		const checkResult = await client.query(
			`SELECT mi.id FROM tblmenuitem mi
       JOIN tblconcession c ON mi.concession_id = c.id
       WHERE mi.id = $1 AND c.concessionaire_id = $2`,
			[id, concessionaireId]
		)
		if (!checkResult.rows.length) {
			throw new Error('Menu item not found or unauthorized')
		}

		// Update menu item
		let updateFields = []
		let updateParams = []
		let idx = 1

		if (item_name) {
			updateFields.push(`item_name = $${idx++}`)
			updateParams.push(item_name)
		}
		if (price) {
			updateFields.push(`price = $${idx++}`)
			updateParams.push(parseFloat(price))
		}
		if (category) {
			updateFields.push(`category = $${idx++}`)
			updateParams.push(category)
		}
		if (availability !== null && availability !== undefined) {
			updateFields.push(`available = $${idx++}`)
			updateParams.push(availability)
		}
		if (imageData) {
			updateFields.push(`image = $${idx++}`)
			updateParams.push(imageData)
		}

		if (updateFields.length) {
			await client.query(
				`UPDATE tblmenuitem SET ${updateFields.join(', ')} WHERE id = $${idx}`,
				[...updateParams, id]
			)
		}

		// Delete existing variation groups & variations
		const existingGroups = await client.query(
			`SELECT id FROM tblitemvariationgroup WHERE menu_item_id = $1`,
			[id]
		)
		const groupIds = existingGroups.rows.map((g) => g.id)

		if (groupIds.length > 0) {
			await client.query(
				`DELETE FROM tblitemvariation WHERE item_variation_group_id = ANY($1::int[])`,
				[groupIds]
			)
			await client.query(
				`DELETE FROM tblitemvariationgroup WHERE id = ANY($1::int[])`,
				[groupIds]
			)
		}

		// Insert new variation groups & variations
		for (const group of variations) {
			const allVariations = Array.isArray(group.variations)
				? group.variations
				: []
			const availableVariations = allVariations.filter(
				(v) => v.available !== false
			)
			const availableCount = availableVariations.length
			let minSel = Number(group.min_selection ?? 0) || 0
			let maxSel = Number(group.max_selection ?? 1) || 1
			if (availableCount > 0) {
				if (maxSel > availableCount) maxSel = availableCount
				if (minSel > maxSel) minSel = maxSel
			}

			const insertGroup = await client.query(
				`INSERT INTO tblitemvariationgroup 
          (variation_group_name, menu_item_id, min_selection, max_selection) 
        VALUES ($1, $2, $3, $4) RETURNING id`,
				[group.label || 'Default', id, minSel, maxSel]
			)
			const groupId = insertGroup.rows[0].id

			for (const v of group.variations) {
				if (!v.name) continue
				const avail =
					typeof v.available === 'boolean'
						? v.available
						: typeof v.available === 'string'
						? v.available.toLowerCase() === 'true'
						: true // default to true when undefined/null

				let maxAmount = null
				if (typeof v.max_amount === 'number') {
					maxAmount = v.max_amount > 0 ? v.max_amount : null
				} else if (typeof v.max_amount === 'string') {
					const trimmed = v.max_amount.trim()
					if (trimmed) {
						const parsed = parseInt(trimmed, 10)
						maxAmount = parsed > 0 ? parsed : null
					}
				}

				// If image_url is a data URL, decode it so imported / existing variations keep their images
				let imageBuffer = null
				if (v.image_url) {
					imageBuffer = parseImageDataUrlToBuffer(v.image_url)
				}

				await client.query(
					`INSERT INTO tblitemvariation 
            (item_variation_group_id, variation_name, additional_price, max_amount, available, image)
          VALUES ($1, $2, $3, $4, $5, $6)`,
					[
						groupId,
						v.name,
						parseFloat(v.price) || 0,
						maxAmount,
						avail,
						imageBuffer,
					]
				)
			}
		}
		await client.query('COMMIT')

		res.json({ status: 'success', message: 'Menu item updated successfully' })
	} catch (err) {
		await client.query('ROLLBACK')
		console.error(err)
		res.status(500).json({ status: 'failed', message: 'Internal Server Error' })
	} finally {
		client.release()
	}
}

// =========================
// Delete menu item
// =========================
export const deleteMenuItem = async (req, res) => {
	const { id } = req.params
	const concessionaireId = req.user.id
	const client = await pool.connect()

	try {
		await client.query('BEGIN')

		const checkResult = await client.query(
			`SELECT mi.id FROM tblmenuitem mi
       JOIN tblconcession c ON mi.concession_id = c.id
       WHERE mi.id = $1 AND c.concessionaire_id = $2`,
			[id, concessionaireId]
		)
		if (!checkResult.rows.length) {
			throw new Error('Menu item not found or unauthorized')
		}

		const existingGroups = await client.query(
			`SELECT id FROM tblitemvariationgroup WHERE menu_item_id = $1`,
			[id]
		)
		const groupIds = existingGroups.rows.map((g) => g.id)

		if (groupIds.length > 0) {
			await client.query(
				`DELETE FROM tblitemvariation WHERE item_variation_group_id = ANY($1::int[])`,
				[groupIds]
			)
			await client.query(
				`DELETE FROM tblitemvariationgroup WHERE id = ANY($1::int[])`,
				[groupIds]
			)
		}

		await client.query(`DELETE FROM tblmenuitem WHERE id = $1`, [id])

		await client.query('COMMIT')
		res.json({ status: 'success', message: 'Menu item deleted successfully' })
	} catch (err) {
		await client.query('ROLLBACK')
		console.error(err)
		res.status(500).json({ status: 'failed', message: 'Internal Server Error' })
	} finally {
		client.release()
	}
}

// =========================
// Update menu item availability only
// =========================
export const updateMenuItemAvailability = async (req, res) => {
	const { id } = req.params
	const { available } = req.body

	if (typeof available !== 'boolean') {
		return res.status(400).json({ error: 'availability must be a boolean' })
	}

	try {
		const result = await pool.query(
			`UPDATE tblmenuitem SET available = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
			[available, id]
		)

		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Menu item not found' })
		}

		res.json({ message: 'Item availability updated', item: result.rows[0] })
	} catch (err) {
		console.error('Error updating menu item availability:', err)
		res.status(500).json({ error: 'Failed to update availability' })
	}
}
