import React, { useMemo, useState } from 'react'
import {
	ActivityIndicator,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { RouteProp, useRoute } from '@react-navigation/native'
import { DynamicKeyboardView, DynamicScrollView } from '../../../components'
import { useThemeContext } from '../../../context'
import { useConcessionMenuItems } from '../../../hooks/useBackend'
import { useResponsiveDimensions } from '../../../hooks'
import { useHideNavBar } from '../../../hooks/useHideNavBar'
import { useCustomerNavigation } from '../../../hooks/useNavigation'
import { MenuItemListItem } from '../../../components/customer/menu'
import { createCustomerFullMenuStyles } from '../../../styles/customer'
import type { CustomerStackParamList } from '../../../types'

type FullMenuRouteProp = RouteProp<CustomerStackParamList, 'FullMenuList'>

const FullMenuListScreen: React.FC = () => {
	const route = useRoute<FullMenuRouteProp>()
	const navigation = useCustomerNavigation()
	useHideNavBar()
	const { concessionId, concessionName } = route.params
	const { colors } = useThemeContext()
	const responsive = useResponsiveDimensions()
	const styles = createCustomerFullMenuStyles(colors, responsive)
	const { menuItems, loading, error, refetch } =
		useConcessionMenuItems(concessionId)
	const [searchQuery, setSearchQuery] = useState('')
	const [showFilters, setShowFilters] = useState(false)
	const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
		new Set()
	)

	const availableCategories = useMemo(() => {
		const uniqueNames = new Set<string>()
		menuItems.forEach((item) => {
			if (item.category?.name) {
				uniqueNames.add(item.category.name)
			}
		})
		return Array.from(uniqueNames).sort((a, b) => a.localeCompare(b))
	}, [menuItems])

	const toggleCategory = (category: string) => {
		setSelectedCategories((previous) => {
			const nextSelection = new Set(previous)
			if (nextSelection.has(category)) {
				nextSelection.delete(category)
			} else {
				nextSelection.add(category)
			}
			return nextSelection
		})
	}

	const clearFilters = () => {
		setSelectedCategories(new Set())
		setShowFilters(false)
	}

	const normalizedQuery = searchQuery.trim().toLowerCase()

	const filteredItems = useMemo(() => {
		return menuItems.filter((item) => {
			const matchesSearch =
				normalizedQuery.length === 0 ||
				item.name.toLowerCase().includes(normalizedQuery)

			const matchesCategory =
				selectedCategories.size === 0 ||
				(item.category?.name !== undefined
					? selectedCategories.has(item.category.name)
					: false)

			return matchesSearch && matchesCategory
		})
	}, [menuItems, normalizedQuery, selectedCategories])

	const noResults = !loading && !error && filteredItems.length === 0

	const handleMenuItemPress = (menuItemId: number) => {
		navigation.navigate('MenuItemView', { menuItemId })
	}

	const renderLoadingState = () => (
		<View style={styles.stateContainer}>
			<ActivityIndicator
				size="large"
				color={colors.primary}
			/>
			<Text style={styles.stateMessage}>Loading menu items...</Text>
		</View>
	)

	const renderErrorState = () => (
		<View style={styles.stateContainer}>
			<Text style={styles.stateTitle}>Unable to load menu</Text>
			<Text style={styles.stateMessage}>
				{error ?? 'Failed to load menu items. Please try again.'}
			</Text>
			<TouchableOpacity
				onPress={refetch}
				style={styles.retryButton}
				accessibilityRole="button"
				accessibilityLabel="Retry loading menu items">
				<Text style={styles.retryButtonText}>Try Again</Text>
			</TouchableOpacity>
		</View>
	)

	const renderEmptyState = () => (
		<View style={styles.stateContainer}>
			<Text style={styles.stateTitle}>No menu items yet</Text>
			<Text style={styles.stateMessage}>
				This concession has no menu items available right now.
			</Text>
		</View>
	)

	return (
		<DynamicKeyboardView>
			<DynamicScrollView
				style={styles.container}
				showsVerticalScrollIndicator>
				<View style={styles.headerContainer}>
					<Text style={styles.concessionTitle}>{concessionName}</Text>
					<Text style={styles.itemCountLabel}>
						Showing {filteredItems.length} of {menuItems.length}{' '}
						{menuItems.length === 1 ? 'item' : 'items'}
					</Text>
				</View>

				<View style={styles.searchRow}>
					<View style={styles.searchInputWrapper}>
						<Ionicons
							name="search"
							size={responsive.getResponsiveFontSize(18)}
							color={colors.textSecondary}
							style={styles.searchIcon}
						/>
						<TextInput
							value={searchQuery}
							onChangeText={setSearchQuery}
							placeholder="Search concession menu"
							placeholderTextColor={colors.textSecondary}
							style={styles.searchInput}
							returnKeyType="search"
						/>
						{searchQuery.length > 0 ? (
							<TouchableOpacity
								onPress={() => setSearchQuery('')}
								style={styles.searchClearButton}
								accessibilityLabel="Clear search text">
								<Text style={styles.searchClearButtonText}>Clear</Text>
							</TouchableOpacity>
						) : null}
					</View>
					<TouchableOpacity
						style={styles.filtersToggleButton}
						onPress={() => setShowFilters((previous) => !previous)}
						accessibilityLabel="Toggle filters">
						<Text style={styles.filtersToggleText}>
							{showFilters ? 'Hide Filters' : 'Filters'}
						</Text>
					</TouchableOpacity>
				</View>

				{showFilters ? (
					<View style={styles.filtersContainer}>
						<View style={styles.filtersHeader}>
							<Text style={styles.filtersTitle}>Filter by category</Text>
							<TouchableOpacity
								style={styles.clearFiltersButton}
								onPress={clearFilters}
								accessibilityLabel="Clear all filters">
								<Text style={styles.clearFiltersText}>Clear Filters</Text>
							</TouchableOpacity>
						</View>
						{availableCategories.length === 0 ? (
							<Text style={styles.stateMessage}>
								No categories available for filtering.
							</Text>
						) : (
							<View style={styles.filtersChipsRow}>
								{availableCategories.map((category) => {
									const isActive = selectedCategories.has(category)
									return (
										<TouchableOpacity
											key={category}
											style={[
												styles.filterChip,
												isActive && styles.filterChipActive,
											]}
											onPress={() => toggleCategory(category)}
											accessibilityLabel={`Filter by ${category}`}>
											<Text
												style={[
													styles.filterChipText,
													isActive && styles.filterChipTextActive,
												]}>
												{category}
											</Text>
										</TouchableOpacity>
									)
								})}
							</View>
						)}
					</View>
				) : null}

				{loading && menuItems.length === 0 ? renderLoadingState() : null}
				{!loading && error ? renderErrorState() : null}
				{!loading && !error && menuItems.length === 0
					? renderEmptyState()
					: null}

				{!loading && !error && menuItems.length > 0 ? (
					noResults ? (
						<View style={styles.stateContainer}>
							<Text style={styles.stateMessage}>
								No items match your search or filters.
							</Text>
						</View>
					) : (
						filteredItems.map((item) => (
							<MenuItemListItem
								key={item.id}
								item={item}
								onPress={() => handleMenuItemPress(item.id)}
							/>
						))
					)
				) : null}

				{loading && menuItems.length > 0 ? (
					<View style={styles.stateContainer}>
						<ActivityIndicator
							size="small"
							color={colors.primary}
						/>
					</View>
				) : null}
			</DynamicScrollView>
		</DynamicKeyboardView>
	)
}

export default FullMenuListScreen
