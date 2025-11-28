// screens/customer/MenuItems.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
	View,
	Text,
	TouchableOpacity,
	FlatList,
	Modal,
	Image,
	StyleSheet,
	ActivityIndicator,
	TextInput,
	ScrollView,
	RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import api from '../../../libs/apiCall' // axios instance
import { useNavigation } from '@react-navigation/native'

// ========================================
// TypeScript types
// ========================================
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

interface Concession {
	id: number
	name: string
	items: MenuItem[]
}

interface Cafeteria {
	id: number
	name: string
	concessions: Concession[]
}

// ========================================
// Helper functions
// ========================================

// Fisher-Yates shuffle for randomization
function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array]
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
	}
	return shuffled
}

// Group menu items by cafeteria and concession
function groupMenuItems(items: MenuItem[]): Cafeteria[] {
	const cafeteriaMap = new Map<number, Cafeteria>()

	items.forEach((item) => {
		// Get or create cafeteria
		if (!cafeteriaMap.has(item.cafeteria_id)) {
			cafeteriaMap.set(item.cafeteria_id, {
				id: item.cafeteria_id,
				name: item.cafeteria_name,
				concessions: [],
			})
		}

		const cafeteria = cafeteriaMap.get(item.cafeteria_id)!

		// Get or create concession within cafeteria
		let concession = cafeteria.concessions.find(
			(c) => c.id === item.concession_id
		)

		if (!concession) {
			concession = {
				id: item.concession_id,
				name: item.concession_name,
				items: [],
			}
			cafeteria.concessions.push(concession)
		}

		// Add item to concession
		concession.items.push(item)
	})

	// Convert map to array and randomize order
	const cafeterias = shuffleArray(Array.from(cafeteriaMap.values()))

	// Randomize concessions within each cafeteria
	cafeterias.forEach((cafeteria) => {
		cafeteria.concessions = shuffleArray(cafeteria.concessions)
	})

	return cafeterias
}

const MenuItems = () => {
	// data
	const [menuItems, setMenuItems] = useState<MenuItem[]>([])
	const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]) // All fetched items
	const [groupedCafeterias, setGroupedCafeterias] = useState<Cafeteria[]>([])
	const [cafeteriaFilters, setCafeteriaFilters] = useState<any[]>([]) // Available cafeterias for filter
	const [concessions, setConcessions] = useState<any[]>([])
	const [categories, setCategories] = useState<string[]>([])
	const navigation = useNavigation()

	// filter state (only cafeteria filter used in grouped view)
	const [selectedCafeteriaId, setSelectedCafeteriaId] = useState<number | null>(
		null
	)
	const [sortBy, setSortBy] = useState<string>('name')
	const [searchQuery, setSearchQuery] = useState<string>('')

	// ui state
	const [loading, setLoading] = useState(false)
	const [refreshing, setRefreshing] = useState(false)
	const [filtersVisible, setFiltersVisible] = useState(false)

	// fetch cafeterias for filter dropdown
	const fetchCafeterias = async () => {
		try {
			const cafRes = await api.get('/cafeteria/all')
			setCafeteriaFilters(cafRes.data.data)
		} catch (err) {
			console.error('Error loading cafeterias:', err)
		}
	}

	// fetch all menu items at once (no pagination for grouped view)
	const fetchItems = async (isRefresh = false) => {
		try {
			if (isRefresh) setRefreshing(true)
			else setLoading(true)

			// Fetch all items - no pagination
			const res = await api.get<{ data: MenuItem[] }>('/menu-item/all', {
				params: {
					sortBy,
					limit: 1000, // large limit to get all items
				},
			})

			const items = res.data.data as MenuItem[]
			setAllMenuItems(items)

			// Apply cafeteria filter if selected
			const filtered =
				selectedCafeteriaId ?
					items.filter((item) => item.cafeteria_id === selectedCafeteriaId)
				:	items

			// Group items by cafeteria and concession
			const grouped = groupMenuItems(filtered)
			setGroupedCafeterias(grouped)

			// For search results (flat list)
			setMenuItems(filtered)

			// Extract unique categories
			const uniqueCategories: string[] = Array.from(
				new Set(items.map((i) => i.category || '').filter(Boolean))
			)
			setCategories(uniqueCategories)
		} catch (err) {
			console.error('Error fetching menu items:', err)
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	useEffect(() => {
		fetchCafeterias()
		fetchItems(true)
	}, [])

	useEffect(() => {
		fetchItems(false)
	}, [selectedCafeteriaId, sortBy])

	// Filter menu items for search
	const filteredMenuItems = useMemo(() => {
		const q = searchQuery.trim().toLowerCase()
		if (!q) return []

		return allMenuItems.filter(
			(item) =>
				item.item_name.toLowerCase().includes(q) ||
				item.concession_name.toLowerCase().includes(q) ||
				item.cafeteria_name.toLowerCase().includes(q) ||
				(item.category || '').toLowerCase().includes(q)
		)
	}, [searchQuery, allMenuItems])

	// ========================================
	// Render functions
	// ========================================

	// Render a single menu item card
	const renderMenuItem = (item: MenuItem, isInHorizontalScroll = false) => (
		<TouchableOpacity
			key={item.id}
			style={[styles.card, isInHorizontalScroll && styles.horizontalCard]}
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
						(item as any).feedback?.feedback_count ??
							(item as any).feedback_count ??
							0
					)
					const avgRating =
						(item as any).feedback?.avg_rating ?? (item as any).avg_rating
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

					const groups = (item as any).variations || []
					if (!groups.length) return <Text style={styles.price}>₱0.00</Text>

					// Helper to get sorted price list for a group's variations
					const getSortedPrices = (g: any) =>
						(g.variations || [])
							.map((v: any) => Number(v.price))
							.filter((n: number) => Number.isFinite(n))
							.sort((a: number, b: number) => a - b)

					// Minimum extra: sum the cheapest options required by group constraints
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

					// Maximum extra: sum the most expensive options allowed by group constraints
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
						const chosen = prices.slice(-maxSel) // most expensive allowed
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

	// Render a concession card with horizontal scroll of items
	const renderConcession = (concession: Concession) => {
		const itemsToShow = concession.items.slice(0, 5) // Show max 5 items
		const hasMore = concession.items.length > 5

		return (
			<View
				key={concession.id}
				style={styles.concessionCard}>
				<Text style={styles.concessionName}>{concession.name}</Text>

				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.horizontalScrollContent}>
					{itemsToShow.map((item) => renderMenuItem(item, true))}

					{hasMore && (
						<TouchableOpacity
							style={styles.viewAllButton}
							onPress={() =>
								(navigation as any).navigate('Full Concession Menu', {
									concessionId: concession.id,
									concessionName: concession.name,
									cafeteriaId: concession.items[0]?.cafeteria_id,
								})
							}>
							<Text style={styles.viewAllText}>View All</Text>
							<Text style={styles.viewAllCount}>
								({concession.items.length} items)
							</Text>
						</TouchableOpacity>
					)}
				</ScrollView>
			</View>
		)
	}

	// Render a cafeteria section with all its concessions
	const renderCafeteria = (cafeteria: Cafeteria) => (
		<View
			key={cafeteria.id}
			style={styles.cafeteriaSection}>
			<Text style={styles.cafeteriaName}>Cafeteria: {cafeteria.name}</Text>
			{cafeteria.concessions.map((concession) => renderConcession(concession))}
			<View style={styles.cafeteriaDivider} />
		</View>
	)

	// Determine if we're showing search results or grouped view
	const isSearching = searchQuery.trim().length > 0

	return (
		<View style={{ flex: 1 }}>
			{/* Search + Filters */}
			<View style={styles.searchFilterRow}>
				<TextInput
					style={styles.searchInput}
					placeholder="Search menu items..."
					value={searchQuery}
					onChangeText={setSearchQuery}
					blurOnSubmit={false}
				/>

				<TouchableOpacity
					style={styles.filterBtn}
					onPress={() => setFiltersVisible(true)}>
					<Ionicons
						name="funnel-outline"
						size={20}
						color="#fff"
					/>
				</TouchableOpacity>
			</View>

			{/* Main Content */}
			{loading ?
				<ActivityIndicator
					size="large"
					color="#A40C2D"
					style={{ marginTop: 20 }}
				/>
			: isSearching ?
				// Search Results - Flat list
				<FlatList
					data={filteredMenuItems}
					renderItem={({ item }) => renderMenuItem(item, false)}
					keyExtractor={(i) => i.id.toString()}
					contentContainerStyle={{ padding: 10 }}
					keyboardShouldPersistTaps="handled"
					ListEmptyComponent={
						<Text style={styles.emptyText}>No items match your search</Text>
					}
				/>
				// Grouped View by Cafeteria and Concession
			:	<ScrollView
					contentContainerStyle={{ padding: 10 }}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={() => fetchItems(true)}
							colors={['#A40C2D']}
						/>
					}>
					{groupedCafeterias.length === 0 ?
						<Text style={styles.emptyText}>No menu items available</Text>
					:	groupedCafeterias.map((cafeteria) => renderCafeteria(cafeteria))}
				</ScrollView>
			}

			{/* Filter modal */}
			<Modal
				visible={filtersVisible}
				animationType="slide"
				onRequestClose={() => setFiltersVisible(false)}>
				<View style={styles.filterContainer}>
					<View style={styles.filterHeaderRow}>
						<Text style={styles.filterHeader}>Filters</Text>
						<TouchableOpacity onPress={() => setFiltersVisible(false)}>
							<Text style={styles.closeText}>Close</Text>
						</TouchableOpacity>
					</View>

					<ScrollView style={{ flex: 1 }}>
						{/* Cafeteria Filter (single select) */}
						<Text style={styles.label}>Cafeteria</Text>
						<View style={styles.filterChipRow}>
							<TouchableOpacity onPress={() => setSelectedCafeteriaId(null)}>
								<Text
									style={
										selectedCafeteriaId === null ? styles.active : styles.option
									}>
									All Cafeterias
								</Text>
							</TouchableOpacity>
							{cafeteriaFilters.map((caf) => {
								const active = selectedCafeteriaId === caf.id
								return (
									<TouchableOpacity
										key={caf.id}
										onPress={() => setSelectedCafeteriaId(caf.id)}>
										<Text style={active ? styles.active : styles.option}>
											{caf.cafeteria_name || caf.name}
										</Text>
									</TouchableOpacity>
								)
							})}
						</View>

						{/* Sort */}
						<Text style={styles.label}>Sort by</Text>
						<View style={styles.filterChipRow}>
							{[
								{ key: 'name', label: 'Name (A → Z)' },
								{ key: 'price_asc', label: 'Price (Low → High)' },
								{ key: 'price_desc', label: 'Price (High → Low)' },
							].map((opt) => (
								<TouchableOpacity
									key={opt.key}
									onPress={() => setSortBy(opt.key)}>
									<Text
										style={sortBy === opt.key ? styles.active : styles.option}>
										{opt.label}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</ScrollView>

					{/* Apply / Close */}
					<TouchableOpacity
						style={styles.applyBtn}
						onPress={() => setFiltersVisible(false)}>
						<Text style={styles.applyText}>Apply</Text>
					</TouchableOpacity>
				</View>
			</Modal>
		</View>
	)
}

const styles = StyleSheet.create({
	searchFilterRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		marginTop: 14,
		marginBottom: 10,
		columnGap: 10,
	},
	searchInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 999,
		paddingVertical: 8,
		paddingHorizontal: 12,
		backgroundColor: '#fff',
	},
	filterBtn: {
		paddingVertical: 8,
		paddingHorizontal: 14,
		backgroundColor: '#A40C2D',
		borderRadius: 999,
	},
	filterText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
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
	filterContainer: { flex: 1, padding: 20, backgroundColor: '#fff' },
	filterHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
	filterHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
	},
	closeText: { color: '#A40C2D', fontWeight: '600', fontSize: 14 },
	label: { marginTop: 15, fontWeight: '600' },
	filterChipRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 8,
		gap: 8,
	},
	option: {
		paddingVertical: 6,
		paddingHorizontal: 12,
		fontSize: 14,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: '#ccc',
		color: '#333',
	},
	active: {
		paddingVertical: 6,
		paddingHorizontal: 12,
		fontSize: 14,
		borderRadius: 999,
		backgroundColor: '#A40C2D',
		borderWidth: 1,
		borderColor: '#A40C2D',
		color: '#fff',
	},
	applyBtn: {
		backgroundColor: '#A40C2D',
		padding: 12,
		borderRadius: 8,
		marginTop: 20,
	},
	applyText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
	// New styles for grouped view
	cafeteriaSection: {
		marginBottom: 20,
	},
	cafeteriaName: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#1f2937',
		marginBottom: 12,
	},
	cafeteriaDivider: {
		height: 1,
		backgroundColor: '#e5e7eb',
		marginTop: 10,
	},
	concessionCard: {
		marginBottom: 16,
	},
	concessionName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 8,
	},
	horizontalScrollContent: {
		paddingRight: 10,
	},
	horizontalCard: {
		width: 200,
		marginRight: 12,
	},
	viewAllButton: {
		width: 120,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f3f4f6',
		borderRadius: 10,
		padding: 16,
		marginRight: 12,
	},
	viewAllText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#A40C2D',
		marginBottom: 4,
	},
	viewAllCount: {
		fontSize: 12,
		color: '#6b7280',
	},
	emptyText: {
		textAlign: 'center',
		color: '#6b7280',
		fontSize: 16,
		marginTop: 40,
	},
})

export default MenuItems
