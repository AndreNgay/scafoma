import { pool } from '../libs/database.js'

// Get analytics data for a specific concessionaire
export const getConcessionaireAnalytics = async (req, res) => {
	const { id } = req.params // concessionaire_id

	try {
		// Get concession info
		const concessionResult = await pool.query(
			`SELECT c.id, c.concession_name FROM tblconcession c WHERE c.concessionaire_id = $1`,
			[id]
		)

		if (concessionResult.rowCount === 0) {
			return res.status(404).json({ error: 'Concession not found' })
		}

		const concession = concessionResult.rows[0]

		// Get total revenue and orders
		const revenueResult = await pool.query(
			`SELECT 
				COALESCE(SUM(CASE WHEN o.order_status = 'completed' THEN o.total_price ELSE 0 END), 0) as total_revenue,
				COUNT(*) as total_orders,
				COUNT(CASE WHEN o.order_status = 'completed' THEN 1 END) as completed_orders,
				COALESCE(SUM(CASE WHEN o.order_status = 'completed' AND DATE(o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') = CURRENT_DATE THEN o.total_price ELSE 0 END), 0) as daily_revenue,
				COALESCE(SUM(CASE WHEN o.order_status = 'completed' AND o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila' >= DATE_TRUNC('week', CURRENT_DATE) THEN o.total_price ELSE 0 END), 0) as weekly_revenue
			FROM tblorder o
			JOIN tblconcession c ON o.concession_id = c.id
			WHERE c.concessionaire_id = $1 AND o.in_cart = FALSE`,
			[id]
		)

		// Get daily sales for last 7 days
		const dailySalesResult = await pool.query(
			`SELECT 
				TO_CHAR(o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila', 'Dy') as day,
				TO_CHAR(o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD') as date,
				COALESCE(SUM(CASE WHEN o.order_status = 'completed' THEN o.total_price ELSE 0 END), 0) as amount
			FROM tblorder o
			JOIN tblconcession c ON o.concession_id = c.id
			WHERE c.concessionaire_id = $1 
				AND o.in_cart = FALSE
				AND o.created_at >= NOW() AT TIME ZONE 'UTC' - INTERVAL '7 days'
			GROUP BY TO_CHAR(o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila', 'Dy'), 
					 TO_CHAR(o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD')
			ORDER BY date
			LIMIT 7`,
			[id]
		)

		// Get monthly orders for last 6 months
		const monthlyOrdersResult = await pool.query(
			`SELECT 
				TO_CHAR(o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila', 'Mon') as month,
				COUNT(*) as count
			FROM tblorder o
			JOIN tblconcession c ON o.concession_id = c.id
			WHERE c.concessionaire_id = $1 
				AND o.in_cart = FALSE
				AND o.created_at >= NOW() AT TIME ZONE 'UTC' - INTERVAL '6 months'
			GROUP BY TO_CHAR(o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila', 'Mon'), 
					 EXTRACT(MONTH FROM o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')
			ORDER BY EXTRACT(MONTH FROM o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')
			LIMIT 6`,
			[id]
		)

		// Get top selling items
		const topItemsResult = await pool.query(
			`SELECT 
				m.item_name,
				SUM(od.quantity) as count
			FROM tblorderdetail od
			JOIN tblorder o ON od.order_id = o.id
			JOIN tblconcession c ON o.concession_id = c.id
			JOIN tblmenuitem m ON od.item_id = m.id
			WHERE c.concessionaire_id = $1 
				AND o.in_cart = FALSE
				AND o.order_status = 'completed'
			GROUP BY m.item_name
			ORDER BY count DESC
			LIMIT 5`,
			[id]
		)

		// Format daily sales with all days of week
		const dailySales = []
		const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
		const salesData = dailySalesResult.rows

		daysOfWeek.forEach(day => {
			const found = salesData.find(item => item.day === day)
			dailySales.push({
				day,
				amount: found ? Number(found.amount) : 0
			})
		})

		// Format monthly orders
		const monthlyOrders = monthlyOrdersResult.rows.map(row => ({
			month: row.month,
			count: Number(row.count)
		}))

		// Format top items with colors
		const colors = ['#A40C2D', '#DC2626', '#F87171', '#FCA5A5', '#FECACA']
		const topItems = topItemsResult.rows.map((row, index) => ({
			name: row.item_name,
			count: Number(row.count),
			color: colors[index % colors.length]
		}))

		const stats = revenueResult.rows[0]

		res.json({
			stats: {
				totalRevenue: Number(stats.total_revenue),
				totalOrders: Number(stats.total_orders),
				dailyRevenue: Number(stats.daily_revenue),
				weeklyRevenue: Number(stats.weekly_revenue)
			},
			dailySales,
			monthlyOrders,
			topItems
		})

	} catch (error) {
		console.error('Error fetching concessionaire analytics:', error)
		res.status(500).json({ error: 'Failed to fetch analytics data' })
	}
}
