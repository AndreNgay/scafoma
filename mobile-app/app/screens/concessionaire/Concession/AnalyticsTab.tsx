import React, { useEffect, useState } from 'react'
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	ActivityIndicator,
	Dimensions,
} from 'react-native'
import api from '../../../libs/apiCall'
import { useToast } from '../../../contexts/ToastContext'

const { width } = Dimensions.get('window')

interface AnalyticsData {
	dailySales: { day: string; amount: number }[]
	monthlyOrders: { month: string; count: number }[]
	topItems: { name: string; count: number; color: string }[]
	stats: {
		totalRevenue: number
		totalOrders: number
		dailyRevenue: number
		weeklyRevenue: number
	}
}

const AnalyticsTab = () => {
	const [loading, setLoading] = useState(true)
	const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
	const { showToast } = useToast()

	const fetchAnalytics = async () => {
		try {
			// Get concessionaire ID from concession data
			const concessionRes = await api.get('/concession')
			const concessionaireId = concessionRes.data.data.concessionaire_id

			// Fetch analytics data
			const res = await api.get(`/concessionaire-analytics/${concessionaireId}`)
			setAnalyticsData(res.data)
		} catch (error) {
			console.error('Error fetching analytics:', error)
			showToast('error', 'Failed to fetch analytics data')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchAnalytics()
	}, [])

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="darkred" />
				<Text style={styles.loadingText}>Loading analytics...</Text>
			</View>
		)
	}

	if (!analyticsData || !analyticsData.stats) {
		return (
			<View style={styles.center}>
				<Text>No analytics data available.</Text>
			</View>
		)
	}

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* Stats Cards */}
			<View style={styles.statsContainer}>
				<View style={styles.statCard}>
					<Text style={styles.statValue}>
						₱{(analyticsData.stats.totalRevenue || 0).toLocaleString()}
					</Text>
					<Text style={styles.statLabel}>Total Revenue</Text>
				</View>
				<View style={styles.statCard}>
					<Text style={styles.statValue}>{analyticsData.stats.totalOrders || 0}</Text>
					<Text style={styles.statLabel}>Total Orders</Text>
				</View>
			</View>

			<View style={styles.statsContainer}>
				<View style={styles.statCard}>
					<Text style={styles.statValue}>
						₱{(analyticsData.stats.dailyRevenue || 0).toLocaleString()}
					</Text>
					<Text style={styles.statLabel}>Daily Revenue</Text>
				</View>
				<View style={styles.statCard}>
					<Text style={styles.statValue}>
						₱{(analyticsData.stats.weeklyRevenue || 0).toLocaleString()}
					</Text>
					<Text style={styles.statLabel}>Weekly Revenue</Text>
				</View>
			</View>

			{/* Daily Sales Chart */}
			<View style={styles.chartContainer}>
				<Text style={styles.chartTitle}>Daily Sales (Last 7 Days)</Text>
				<View style={styles.barChartContainer}>
					{(analyticsData.dailySales || []).map((item, index) => (
						<View key={index} style={styles.barItem}>
							<View style={styles.barWrapper}>
								<View
									style={[
										styles.bar,
										{
											height: (analyticsData.dailySales || []).some(d => d.amount > 0)
												? `${Math.max((item.amount / Math.max(...(analyticsData.dailySales || []).map(d => d.amount))) * 100, 5)}%`
												: '5%',
											backgroundColor: '#A40C2D',
										},
									]}
								/>
							</View>
							<Text style={styles.barLabel}>{item.day}</Text>
							<Text style={styles.barValue}>₱{item.amount}</Text>
						</View>
					))}
				</View>
			</View>

			{/* Monthly Orders Chart */}
			<View style={styles.chartContainer}>
				<Text style={styles.chartTitle}>Monthly Orders</Text>
				<View style={styles.barChartContainer}>
					{(analyticsData.monthlyOrders || []).map((item, index) => (
						<View key={index} style={styles.barItem}>
							<View style={styles.barWrapper}>
								<View
									style={[
										styles.bar,
										{
											height: (analyticsData.monthlyOrders || []).some(m => m.count > 0)
												? `${Math.max((item.count / Math.max(...(analyticsData.monthlyOrders || []).map(m => m.count))) * 100, 5)}%`
												: '5%',
											backgroundColor: '#DC2626',
										},
									]}
								/>
							</View>
							<Text style={styles.barLabel}>{item.month}</Text>
							<Text style={styles.barValue}>{item.count}</Text>
						</View>
					))}
				</View>
			</View>

			{/* Top Selling Items */}
			<View style={styles.chartContainer}>
				<Text style={styles.chartTitle}>Top Selling Items</Text>
				<View style={styles.listContainer}>
					{(analyticsData.topItems || []).map((item, index) => (
						<View key={index} style={styles.listItem}>
							<View style={styles.itemInfo}>
								<View
									style={[
										styles.itemColor,
										{ backgroundColor: item.color },
									]}
								/>
								<Text style={styles.itemName}>{item.name}</Text>
							</View>
							<Text style={styles.itemCount}>{item.count} sold</Text>
						</View>
					))}
				</View>
			</View>
		</ScrollView>
	)
}

export default AnalyticsTab

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8f9fa',
		padding: 16,
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		marginTop: 10,
		color: '#666',
	},
	statsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 16,
	},
	statCard: {
		flex: 1,
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginHorizontal: 4,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 3.84,
		elevation: 5,
	},
	statValue: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#A40C2D',
	},
	statLabel: {
		fontSize: 12,
		color: '#666',
		marginTop: 4,
	},
	chartContainer: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 3.84,
		elevation: 5,
	},
	chartTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 12,
	},
	barChartContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		alignItems: 'flex-end',
		height: 150,
		paddingHorizontal: 8,
	},
	barItem: {
		alignItems: 'center',
		flex: 1,
	},
	barWrapper: {
		height: 120,
		justifyContent: 'flex-end',
		alignItems: 'center',
		marginBottom: 4,
	},
	bar: {
		width: 20,
		minHeight: 5,
		borderRadius: 4,
	},
	barLabel: {
		fontSize: 10,
		color: '#666',
		marginTop: 4,
	},
	barValue: {
		fontSize: 10,
		color: '#333',
		fontWeight: '600',
		marginTop: 2,
	},
	listContainer: {
		paddingVertical: 8,
	},
	listItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	itemInfo: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	itemColor: {
		width: 12,
		height: 12,
		borderRadius: 6,
		marginRight: 12,
	},
	itemName: {
		fontSize: 14,
		color: '#333',
		fontWeight: '500',
	},
	itemCount: {
		fontSize: 14,
		color: '#A40C2D',
		fontWeight: '600',
	},
})
