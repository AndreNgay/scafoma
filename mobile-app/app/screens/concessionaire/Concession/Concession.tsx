import React, { useEffect, useState } from 'react'
import {
	View,
	Text,
	StyleSheet,
	ActivityIndicator,
	ScrollView,
	TouchableOpacity,
} from 'react-native'
import api from '../../../libs/apiCall'
import { useToast } from '../../../contexts/ToastContext'
import AnalyticsTab from './AnalyticsTab'
import DetailsTab from './DetailsTab'

type Concession = {
	id: number
	concession_name: string
	image_url?: string
	cafeteria_name: string
	location: string
	gcash_payment_available: boolean
	oncounter_payment_available: boolean
	gcash_number?: string
	receipt_timer?: string
	status: 'open' | 'closed'
}

const Concession = () => {
	const [concession, setConcession] = useState<Concession | null>(null)
	const [loading, setLoading] = useState(true)
	const [activeTab, setActiveTab] = useState<'analytics' | 'details'>('analytics')
	const { showToast } = useToast()

	const fetchConcession = async () => {
		try {
			const res = await api.get('/concession')
			setConcession(res.data.data)
		} catch (error) {
			console.error('Error fetching concession:', error)
			showToast('error', 'Failed to fetch concession data')
		} finally {
			setLoading(false)
		}
	}

	const handleConcessionUpdate = (updatedConcession: Concession) => {
		setConcession(updatedConcession)
	}

	useEffect(() => {
		fetchConcession()
	}, [])

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator
					size="large"
					color="#A40C2D"
				/>
			</View>
		)
	}

	if (!concession) {
		return (
			<View style={styles.center}>
				<Text>No concession found.</Text>
			</View>
		)
	}

	const tabs: { key: 'analytics' | 'details'; label: string }[] = [
		{ key: 'analytics', label: 'Analytics' },
		{ key: 'details', label: 'Details' },
	]

	return (
		<View style={styles.screen}>
			<ScrollView style={styles.container}>
				{/* Tab Navigation */}
				<View style={styles.tabContainer}>
					{tabs.map((tab) => (
						<TouchableOpacity
							key={tab.key}
							style={[
								styles.tabButton,
								activeTab === tab.key && styles.tabButtonActive,
							]}
							onPress={() => setActiveTab(tab.key)}>
							<Text
								style={[
									styles.tabText,
									activeTab === tab.key && styles.tabTextActive,
								]}>
								{tab.label}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				{/* Tab Content */}
				{activeTab === 'analytics' && <AnalyticsTab />}
				{activeTab === 'details' && (
					<DetailsTab
						concession={concession}
						onConcessionUpdate={handleConcessionUpdate}
					/>
				)}

				{/* Bottom spacing */}
				<View style={styles.bottomSpacing} />
			</ScrollView>
		</View>
	)
}

export default Concession

const styles = StyleSheet.create({
	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	screen: {
		flex: 1,
		backgroundColor: '#f8f9fa',
	},
	container: {
		flex: 1,
		backgroundColor: '#f8f9fa',
	},
	tabContainer: {
		flexDirection: 'row',
		backgroundColor: '#fff',
		margin: 16,
		borderRadius: 12,
		padding: 4,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 1,
		},
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 3,
	},
	tabButton: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: 'center',
	},
	tabButtonActive: {
		backgroundColor: '#A40C2D',
	},
	tabText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#6b7280',
	},
	tabTextActive: {
		color: '#fff',
		fontWeight: '600',
	},
	bottomSpacing: {
		height: 20,
	},
})
