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
import api from '../../libs/apiCall'

const PAGE_SIZE = 10

const ViewConcession = () => {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const params = (route.params as any) || {}
	const [details, setDetails] = useState<any>(params.concession || null)
	const [menuItems, setMenuItems] = useState<any[]>([])
	const cafeteria = params.cafeteria
	const [search, setSearch] = useState('')
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

	const filteredItems = useMemo(() => {
		const q = search.trim().toLowerCase()
		if (!q) return menuItems
		return menuItems.filter(
			(it: any) =>
				(it.item_name || '').toLowerCase().includes(q) ||
				(it.category || '').toLowerCase().includes(q)
		)
	}, [menuItems, search])

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
			<TextInput
				value={search}
				onChangeText={setSearch}
				placeholder="Search menu items..."
				style={styles.searchInput}
			/>
		</>
	)

	// Render menu item
	const renderMenuItem = ({ item }: { item: any }) => {
		const available = Boolean(item.availability)
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
					<Text style={styles.itemPrice}>
						₱{Number(item.price || 0).toFixed(2)}
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
	searchInput: {
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#fff',
		marginHorizontal: 16,
		marginBottom: 12,
		fontSize: 15,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
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
