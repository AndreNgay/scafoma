import React from 'react'
import {
	View,
	Text,
	StyleSheet,
	Image,
	ScrollView,
	FlatList,
	SectionList,
	TouchableOpacity,
	TextInput,
	ActivityIndicator,
	RefreshControl,
} from 'react-native'
import { useEffect, useMemo, useState } from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import api from '../../libs/apiCall'

const PAGE_SIZE = 10

const ViewConcession = () => {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const params = (route.params as any) || {}
	const [details, setDetails] = useState<any>(params.concession || null)
	const [menuItems, setMenuItems] = useState<any[]>([])
	const [filteredItems, setFilteredItems] = useState<any[]>([])
	const cafeteria = params.cafeteria
	const [search, setSearch] = useState('')
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
	const [categories, setCategories] = useState<string[]>([])
	const [loadingDetails, setLoadingDetails] = useState(false)
	const [loadingItems, setLoadingItems] = useState(false)
	const [initialLoading, setInitialLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)

	// Pagination
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		// If a new concession param arrives, sync local state
		if (
			params.concession &&
			(!details || details?.id !== params.concession.id)
		) {
			setDetails(params.concession)
		}

		const load = async () => {
			try {
				setLoadingDetails(true)
				const id = params.concession?.id || details?.id
				if (id) {
					const res = await api.get(`/concession/${id}`)
					setDetails(res.data.data || res.data)
				}
			} catch (e) {
				// no-op: keep whatever we have
			} finally {
				setLoadingDetails(false)
			}
		}
		load()
	}, [params.concession?.id])

	// Fetch menu items with pagination
	const loadItems = async (pageNum = 1, refresh = false) => {
		try {
			const id = details?.id || params.concession?.id
			if (!id) return

			if (!refresh && pageNum > 1) {
				setLoading(true) // show footer loader
			}
			if (pageNum === 1 && !refresh) {
				setInitialLoading(true) // full screen loader
				setLoadingItems(true)
			}

			const res = await api.get(`/menu-item/all`, {
				params: {
					concessionId: id,
					page: pageNum,
					limit: PAGE_SIZE,
				},
			})

			const { data: newItems, pagination } = res.data

			if (refresh) {
				setMenuItems(newItems || [])
			} else if (pageNum === 1) {
				setMenuItems(newItems || [])
			} else {
				setMenuItems((prev) => [...prev, ...(newItems || [])])
			}

			// Extract categories from all items
			if (pageNum === 1 || refresh) {
				const uniqueCategories: string[] = Array.from(
					new Set((newItems || []).map((i: any) => i.category || "").filter(Boolean)),
				);
				setCategories(uniqueCategories);
			}

			setHasMore(pageNum < pagination.totalPages)
		} catch (e) {
			console.error('Error loading menu items:', e)
			if (pageNum === 1) {
				setMenuItems([])
			}
		} finally {
			setLoading(false)
			setInitialLoading(false)
			setLoadingItems(false)
			if (refresh) setRefreshing(false)
		}
	}

	useEffect(() => {
		const id = details?.id || params.concession?.id
		if (id) {
			setPage(1)
			loadItems(1, true)
		}
	}, [details?.id, params.concession?.id])

	// Apply filters when search, category, or menu items change
	useEffect(() => {
		applyFilters();
	}, [search, selectedCategory, menuItems])

	// Pull to refresh
	const onRefresh = () => {
		setRefreshing(true)
		setPage(1)
		loadItems(1, true)
	}

	// Load more on scroll
	const loadMore = () => {
		if (!loading && hasMore) {
			const nextPage = page + 1
			setPage(nextPage)
			loadItems(nextPage)
		}
	}

	// Apply filters function
	const applyFilters = () => {
		let filtered = [...menuItems];

		// Apply search
		const q = search.trim().toLowerCase();
		if (q) {
			filtered = filtered.filter(
				(item: any) =>
					(item.item_name || '').toLowerCase().includes(q) ||
					(item.category || '').toLowerCase().includes(q)
			);
		}

		// Apply category filter
		if (selectedCategory) {
			filtered = filtered.filter((item: any) => item.category === selectedCategory);
		}

		setFilteredItems(filtered);
	}

	// Calculate price range for an item
	const calculatePriceRange = (item: any) => {
		const base = Number(item.price || 0);
		if (base > 0) return { low: base, high: base };

		const groups = item.variations || [];
		if (!groups.length) return { low: 0, high: 0 };

		// Helper to get sorted price list for a group's variations
		const getSortedPrices = (g: any) =>
			(g.variations || [])
				.map((v: any) => Number(v.price))
				.filter((n: number) => Number.isFinite(n))
				.sort((a: number, b: number) => a - b);

		// Minimum extra: sum the cheapest options required by group constraints
		let minExtra = 0;
		for (const g of groups) {
			const prices = getSortedPrices(g);
			if (!prices.length) continue;
			const required = !!g.required_selection;
			const minSel = Number(g.min_selection || 0);
			const need = Math.max(required ? 1 : 0, minSel);
			for (let i = 0; i < need && i < prices.length; i++) {
				minExtra += prices[i];
			}
		}

		// Maximum extra: sum the most expensive options allowed by group constraints
		let maxExtra = 0;
		for (const g of groups) {
			const prices = getSortedPrices(g);
			if (!prices.length) continue;
			const multiple = !!g.multiple_selection;
			const maxSel =
				Number.isFinite(Number(g.max_selection)) &&
				Number(g.max_selection) > 0
					? Number(g.max_selection)
					: multiple
						? prices.length
						: 1;
			const chosen = prices.slice(-maxSel); // most expensive allowed
			for (const p of chosen) maxExtra += p;
		}

		const low = base + minExtra;
		const high = base + Math.max(minExtra, maxExtra);
		return { low, high };
	}

	// Full-screen loader for initial load
	if (initialLoading && !details) {
		return (
			<View
				style={[
					styles.container,
					{ justifyContent: 'center', alignItems: 'center' },
				]}>
				<ActivityIndicator
					size="large"
					color="#A40C2D"
				/>
				<Text style={{ color: '#666', marginTop: 10 }}>
					Loading concession...
				</Text>
			</View>
		)
	}

	// Header component for FlatList
	const ListHeaderComponent = () => (
		<>
			{/* Header image */}
			{!!details?.image_url && (
				<Image
					source={{ uri: details.image_url }}
					style={styles.image}
				/>
			)}
			{!details?.image_url && (
				<View style={[styles.image, styles.imagePlaceholder]} />
			)}

			{/* Concession Info Card */}
			<View style={styles.infoCard}>
				<Text style={styles.concessionName}>
					{details?.concession_name || 'Concession'}
				</Text>
				<Text style={styles.subText}>
					{(cafeteria?.cafeteria_name || details?.cafeteria_name || '').trim()}{' '}
					{details?.location ? `• ${details.location}` : ''}
				</Text>

				{/* Status */}
				{details?.status && (
					<View
						style={[
							styles.statusBadge,
							details.status === 'open' ? styles.open : styles.closed,
						]}>
						<Text style={styles.statusText}>
							{details.status.toUpperCase()}
						</Text>
					</View>
				)}

				{/* Payment Methods */}
				{(details?.gcash_payment_available ||
					details?.oncounter_payment_available) && (
					<>
						<Text style={styles.paymentHeader}>Available Payments</Text>
						{details?.gcash_payment_available && (
							<Text style={styles.paymentText}>
								• GCash{' '}
								{details?.gcash_number ? `(${details.gcash_number})` : ''}
							</Text>
						)}
						{details?.oncounter_payment_available && (
							<Text style={styles.paymentText}>• On-Counter</Text>
						)}
					</>
				)}
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
					value={search}
					onChangeText={setSearch}
					placeholder="Search menu items..."
					style={styles.searchInput}
					blurOnSubmit={false}
				/>
				{search.length > 0 && (
					<TouchableOpacity onPress={() => setSearch("")}>
						<Ionicons name="close-circle" size={20} color="#6b7280" />
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
						onPress={() => setSelectedCategory(null)}
					>
						<Text
							style={[
								styles.categoryChipText,
								selectedCategory === null && styles.categoryChipTextActive,
							]}
						>
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
							onPress={() => setSelectedCategory(cat)}
						>
							<Text
								style={[
									styles.categoryChipText,
									selectedCategory === cat && styles.categoryChipTextActive,
								]}
							>
								{cat}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			)}
		</>
	)

	// Render menu item
	const renderMenuItem = ({ item }: { item: any }) => {
		const available = Boolean(item.availability)
		const priceRange = calculatePriceRange(item)
		
		return (
			<TouchableOpacity
				style={[styles.itemCard, !available && styles.itemDisabled]}
				onPress={() =>
					available &&
					navigation.navigate('Menu Item Details', {
						item,
						concession: details,
						cafeteria,
					})
				}
				disabled={!available}>
				{item.image_url ?
					<Image
						source={{ uri: item.image_url }}
						style={styles.itemImage}
					/>
				:	<View style={[styles.itemImage, styles.itemImagePlaceholder]} />}
				<View style={{ flex: 1 }}>
					<Text style={styles.itemTitle}>{item.item_name}</Text>
					<Text style={styles.itemSub}>{item.category || 'General'}</Text>
					{(() => {
						const feedbackCount = Number(
							item.feedback?.feedback_count ?? item.feedback_count ?? 0,
						);
						const avgRating = item.feedback?.avg_rating ?? item.avg_rating;
						if (
							feedbackCount > 0 &&
							avgRating !== null &&
							avgRating !== undefined
						) {
							return (
								<Text style={styles.feedbackText}>
									⭐ {Number(avgRating).toFixed(1)} ({feedbackCount})
								</Text>
							);
						}
						return <Text style={styles.feedbackEmpty}>No feedback yet</Text>;
					})()}
					<Text style={styles.itemPrice}>
						{priceRange.low === priceRange.high
							? `₱${priceRange.low.toFixed(2)}`
							: `₱${priceRange.low.toFixed(2)} - ₱${priceRange.high.toFixed(2)}`}
					</Text>
				</View>
				{!available && (
					<View style={styles.unavailableBadge}>
						<Text style={styles.unavailableText}>Unavailable</Text>
					</View>
				)}
			</TouchableOpacity>
		)
	}

	// Group items by category for SectionList
	const sections = useMemo(() => {
		const groups: Record<string, any[]> = {}
		for (const it of filteredItems) {
			const cat = it.category || 'Others'
			if (!groups[cat]) groups[cat] = []
			groups[cat].push(it)
		}
		return Object.entries(groups).map(([category, items]) => ({
			title: category,
			data: items,
		}))
	}, [filteredItems])

	return (
		<View style={styles.container}>
			{initialLoading ?
				<View
					style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
					<ActivityIndicator
						size="large"
						color="#A40C2D"
					/>
					<Text style={{ color: '#666', marginTop: 10 }}>
						Loading menu items...
					</Text>
				</View>
			:	<SectionList
					sections={sections}
					keyExtractor={(item) => item.id.toString()}
					renderItem={renderMenuItem}
					renderSectionHeader={({ section }) => (
						<Text style={styles.sectionHeader}>{section.title}</Text>
					)}
					contentContainerStyle={{ paddingBottom: 20 }}
					ListHeaderComponent={ListHeaderComponent}
					ListEmptyComponent={
						<Text style={{ color: '#666', marginTop: 20, textAlign: 'center' }}>
							No menu items found
						</Text>
					}
					onEndReached={loadMore}
					onEndReachedThreshold={0.5}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							tintColor="#A40C2D"
						/>
					}
					ListFooterComponent={
						loading && page > 1 ?
							<ActivityIndicator
								size="small"
								color="#A40C2D"
								style={{ marginVertical: 10 }}
							/>
						:	null
					}
					keyboardShouldPersistTaps="handled"
				/>
			}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f5f5f5' },
	image: { width: '100%', height: 250 },
	imagePlaceholder: { backgroundColor: '#eee' },
	infoCard: {
		backgroundColor: '#fff',
		marginHorizontal: 16,
		marginTop: -30,
		marginBottom: 12,
		padding: 16,
		borderRadius: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	concessionName: { fontSize: 20, fontWeight: 'bold', color: '#A40C2D' },
	subText: { fontSize: 14, color: '#555', marginTop: 3 },
	statusBadge: {
		alignSelf: 'flex-start',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 20,
		marginTop: 10,
	},
	statusText: { color: '#fff', fontWeight: '700', fontSize: 12 },
	open: { backgroundColor: '#16a34a' },
	closed: { backgroundColor: '#9ca3af' },
	sectionHeader: {
		fontSize: 16,
		fontWeight: '600',
		marginTop: 20,
		marginBottom: 12,
		marginHorizontal: 16,
		color: '#A40C2D',
	},
	paymentHeader: {
		fontSize: 15,
		fontWeight: '600',
		marginTop: 12,
		marginBottom: 6,
		color: '#333',
	},
	paymentText: { fontSize: 14, color: '#555', marginBottom: 4 },
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 16,
		marginBottom: 12,
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: '#fff',
		borderRadius: 12,
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
		feedbackText: { marginTop: 2, fontSize: 12, color: '#111' },
	feedbackEmpty: {
		marginTop: 2,
		fontSize: 12,
		color: '#888',
		fontStyle: 'italic',
	},
	itemCard: {
		flexDirection: 'row',
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 12,
		marginBottom: 12,
		marginHorizontal: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	itemDisabled: { opacity: 0.5 },
	itemImage: { width: 72, height: 72, borderRadius: 8, marginRight: 10 },
	itemImagePlaceholder: { backgroundColor: '#eee' },
	itemTitle: { fontWeight: '700' },
	itemSub: { color: '#666', marginTop: 2 },
	itemPrice: { marginTop: 6, fontWeight: '700', color: '#A40C2D' },
	unavailableBadge: {
		alignSelf: 'center',
		backgroundColor: '#e5e7eb',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	unavailableText: { color: '#6b7280', fontWeight: '600', fontSize: 12 },
})

export default ViewConcession
