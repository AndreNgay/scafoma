// screens/customer/MenuItems/FullConcessionMenu.tsx
import React, { useEffect, useState } from 'react'
import {
	View,
	Text,
	TouchableOpacity,
	FlatList,
	Image,
	StyleSheet,
	ActivityIndicator,
	TextInput,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import api from '../../../libs/apiCall'
import { useNavigation, useRoute } from '@react-navigation/native'

interface MenuItem {
	id: number
	item_name: string
	concession_name: string
	concession_id: number
	cafeteria_id: number
	cafeteria_name: string
	price: number
	category?: string
	image_url?: string
	variations?: any[]
	feedback?: any
	feedback_count?: number
	avg_rating?: number
}

const FullConcessionMenu = () => {
	const navigation = useNavigation()
	const route = useRoute<any>()
	const { concessionId, concessionName } = route.params

	const [menuItems, setMenuItems] = useState<MenuItem[]>([])
	const [filteredItems, setFilteredItems] = useState<MenuItem[]>([])
	const [loading, setLoading] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
	const [categories, setCategories] = useState<string[]>([])

	useEffect(() => {
		fetchItems()
	}, [])

	useEffect(() => {
		applyFilters()
	}, [searchQuery, selectedCategory, menuItems])

	const fetchItems = async () => {
		try {
			setLoading(true)
			const res = await api.get<{ data: MenuItem[] }>('/menu-item/all', {
				params: {
					concessionId,
					limit: 1000,
				},
			})

			const items = res.data.data as MenuItem[]
			setMenuItems(items)
			setFilteredItems(items)

			// Extract categories
			const uniqueCategories: string[] = Array.from(
				new Set(items.map((i) => i.category || '').filter(Boolean))
			)
			setCategories(uniqueCategories)
		} catch (err) {
			console.error('Error fetching concession menu:', err)
		} finally {
			setLoading(false)
		}
	}

	const applyFilters = () => {
		let filtered = [...menuItems]

		// Apply search
		const q = searchQuery.trim().toLowerCase()
		if (q) {
			filtered = filtered.filter(
				(item) =>
					item.item_name.toLowerCase().includes(q) ||
					(item.category || '').toLowerCase().includes(q)
			)
		}

		// Apply category filter
		if (selectedCategory) {
			filtered = filtered.filter((item) => item.category === selectedCategory)
		}

		setFilteredItems(filtered)
	}

	const renderMenuItem = (item: MenuItem) => (
		<TouchableOpacity
			key={item.id}
			style={styles.card}
			onPress={() =>
				(navigation as any).navigate('Menu Item Details', {
					item,
					cafeteriaName: item.cafeteria_name,
				})
			}>
			{item.image_url ?
				<Image
					source={{ uri: item.image_url }}
					style={styles.image}
				/>
			:	<View style={styles.placeholder} />}
			<View style={{ flex: 1 }}>
				<Text style={styles.itemName}>{item.item_name}</Text>
				<Text style={styles.subText}>
					{item.concession_name} • {item.cafeteria_name}
				</Text>
				{(() => {
					const feedbackCount = Number(
						item.feedback?.feedback_count ?? item.feedback_count ?? 0
					)
					const avgRating = item.feedback?.avg_rating ?? item.avg_rating
					if (
						feedbackCount > 0 &&
						avgRating !== null &&
						avgRating !== undefined
					) {
						return (
							<Text style={styles.feedbackText}>
								⭐ {Number(avgRating).toFixed(1)} ({feedbackCount})
							</Text>
						)
					}
					return <Text style={styles.feedbackEmpty}>No feedback yet</Text>
				})()}
				{item.category && (
					<Text style={styles.categoryTag}>{item.category}</Text>
				)}
				{(() => {
					const base = Number(item.price || 0)
					if (base > 0)
						return <Text style={styles.price}>₱{base.toFixed(2)}</Text>

					const groups = item.variations || []
					if (!groups.length) return <Text style={styles.price}>₱0.00</Text>

					const getSortedPrices = (g: any) =>
						(g.variations || [])
							.map((v: any) => Number(v.price))
							.filter((n: number) => Number.isFinite(n))
							.sort((a: number, b: number) => a - b)

					let minExtra = 0
					for (const g of groups) {
						const prices = getSortedPrices(g)
						if (!prices.length) continue
						const required = !!g.required_selection
						const minSel = Number(g.min_selection || 0)
						const need = Math.max(required ? 1 : 0, minSel)
						for (let i = 0; i < need && i < prices.length; i++) {
							minExtra += prices[i]
						}
					}

					let maxExtra = 0
					for (const g of groups) {
						const prices = getSortedPrices(g)
						if (!prices.length) continue
						const multiple = !!g.multiple_selection
						const maxSel =
							(
								Number.isFinite(Number(g.max_selection)) &&
								Number(g.max_selection) > 0
							) ?
								Number(g.max_selection)
							: multiple ? prices.length
							: 1
						const chosen = prices.slice(-maxSel)
						for (const p of chosen) maxExtra += p
					}

					const low = base + minExtra
					const high = base + Math.max(minExtra, maxExtra)
					if (!Number.isFinite(low) || !Number.isFinite(high))
						return <Text style={styles.price}>₱0.00</Text>

					return (
						<Text style={styles.price}>
							{low === high ?
								`₱${low.toFixed(2)}`
							:	`₱${low.toFixed(2)} - ₱${high.toFixed(2)}`}
						</Text>
					)
				})()}
			</View>
		</TouchableOpacity>
	)

	return (
		<View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
			{/* Concession Info Header */}
			<View style={styles.infoHeader}>
				<TouchableOpacity
					style={styles.concessionButton}
					onPress={() => {
						// Navigate to ViewConcession
						;(navigation as any).navigate('View Concession', {
							concession: {
								id: concessionId,
								concession_name: concessionName,
								cafeteria_id: menuItems[0]?.cafeteria_id,
							},
							cafeteria: {
								id: menuItems[0]?.cafeteria_id,
								cafeteria_name: menuItems[0]?.cafeteria_name,
							},
						})
					}}
					activeOpacity={0.7}>
					<View style={{ flex: 1 }}>
						<Text style={styles.concessionNameHeader}>{concessionName}</Text>
						<Text style={styles.itemCount}>
							{filteredItems.length}{' '}
							{filteredItems.length === 1 ? 'item' : 'items'}
						</Text>
					</View>
					<Ionicons
						name="chevron-forward"
						size={20}
						color="#A40C2D"
					/>
				</TouchableOpacity>
			</View>

			{/* Search */}
			<View style={styles.searchContainer}>
				<Ionicons
					name="search"
					size={20}
					color="#6b7280"
					style={{ marginRight: 8 }}
				/>
				<TextInput
					style={styles.searchInput}
					placeholder="Search menu..."
					value={searchQuery}
					onChangeText={setSearchQuery}
					blurOnSubmit={false}
				/>
				{searchQuery.length > 0 && (
					<TouchableOpacity onPress={() => setSearchQuery('')}>
						<Ionicons
							name="close-circle"
							size={20}
							color="#6b7280"
						/>
					</TouchableOpacity>
				)}
			</View>

			{/* Category Filter */}
			{categories.length > 0 && (
				<View style={styles.categoryFilterContainer}>
					<TouchableOpacity
						style={[
							styles.categoryChip,
							selectedCategory === null && styles.categoryChipActive,
						]}
						onPress={() => setSelectedCategory(null)}>
						<Text
							style={[
								styles.categoryChipText,
								selectedCategory === null && styles.categoryChipTextActive,
							]}>
							All
						</Text>
					</TouchableOpacity>
					{categories.map((cat) => (
						<TouchableOpacity
							key={cat}
							style={[
								styles.categoryChip,
								selectedCategory === cat && styles.categoryChipActive,
							]}
							onPress={() => setSelectedCategory(cat)}>
							<Text
								style={[
									styles.categoryChipText,
									selectedCategory === cat && styles.categoryChipTextActive,
								]}>
								{cat}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			)}

			{/* Items */}
			{loading ?
				<ActivityIndicator
					size="large"
					color="#A40C2D"
					style={{ marginTop: 20 }}
				/>
			:	<FlatList
					data={filteredItems}
					renderItem={({ item }) => renderMenuItem(item)}
					keyExtractor={(i) => i.id.toString()}
					contentContainerStyle={{ padding: 10 }}
					ListEmptyComponent={
						<Text style={styles.emptyText}>No items found</Text>
					}
				/>
			}
		</View>
	)
}

const styles = StyleSheet.create({
	infoHeader: {
		backgroundColor: '#fff',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 2,
	},
	concessionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 4,
	},
	concessionNameHeader: {
		fontSize: 18,
		fontWeight: '600',
		color: '#A40C2D',
		marginBottom: 2,
	},
	itemCount: {
		fontSize: 13,
		color: '#6b7280',
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 16,
		marginVertical: 12,
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: '#fff',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	searchInput: {
		flex: 1,
		fontSize: 15,
		color: '#1f2937',
		paddingVertical: 4,
	},
	categoryFilterContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: 16,
		paddingBottom: 12,
		gap: 8,
	},
	categoryChip: {
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: '#d1d5db',
		backgroundColor: '#fff',
	},
	categoryChipActive: {
		backgroundColor: '#A40C2D',
		borderColor: '#A40C2D',
	},
	categoryChipText: {
		fontSize: 14,
		color: '#374151',
	},
	categoryChipTextActive: {
		color: '#fff',
		fontWeight: '600',
	},
	card: {
		flexDirection: 'row',
		backgroundColor: '#fff',
		marginBottom: 10,
		padding: 12,
		borderRadius: 10,
		elevation: 2,
	},
	image: { width: 70, height: 70, borderRadius: 8, marginRight: 10 },
	placeholder: {
		width: 70,
		height: 70,
		borderRadius: 8,
		backgroundColor: '#ddd',
		marginRight: 10,
	},
	itemName: { fontWeight: 'bold', fontSize: 16 },
	subText: { fontSize: 12, color: '#555' },
	categoryTag: {
		marginTop: 3,
		fontSize: 12,
		color: '#A40C2D',
		fontWeight: '600',
	},
	price: { marginTop: 5, fontWeight: '600', color: '#A40C2D' },
	feedbackText: { marginTop: 2, fontSize: 12, color: '#111' },
	feedbackEmpty: {
		marginTop: 2,
		fontSize: 12,
		color: '#888',
		fontStyle: 'italic',
	},
	emptyText: {
		textAlign: 'center',
		color: '#6b7280',
		fontSize: 16,
		marginTop: 40,
	},
})

export default FullConcessionMenu
