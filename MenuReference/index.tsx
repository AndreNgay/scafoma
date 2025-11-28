import React, { useEffect, useMemo, useState } from 'react'
import {
	View,
	Text,
	ActivityIndicator,
	TextInput,
	TouchableOpacity,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useThemeContext } from '../../../context'
import { useResponsiveDimensions } from '../../../hooks'
import { createCustomerMenuStyles } from '../../../styles/customer'
import { DynamicKeyboardView, DynamicScrollView } from '../../../components'
import { useCustomerMenu, useMenuSearch } from '../../../hooks/useBackend'
import {
	CafeteriaSection,
	MenuItemListItem,
} from '../../../components/customer/menu'
import { useCustomerNavigation } from '../../../hooks/useNavigation'
import type { CafeteriaWithConcessions } from '../../../types'

const MenuScreen: React.FC = () => {
	const { colors } = useThemeContext()
	const responsive = useResponsiveDimensions()
	const customerMenuStyles = createCustomerMenuStyles(colors, responsive)
	const navigation = useCustomerNavigation()
	const { data, loading, error } = useCustomerMenu()
	const {
		results: searchResults,
		loading: searchLoading,
		error: searchError,
		search,
		clear,
	} = useMenuSearch()
	const [searchQuery, setSearchQuery] = useState('')
	const [debouncedQuery, setDebouncedQuery] = useState('')

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedQuery(searchQuery)
		}, 300)

		return () => {
			clearTimeout(handler)
		}
	}, [searchQuery])

	useEffect(() => {
		const trimmed = debouncedQuery.trim()
		if (trimmed.length > 0) {
			void search(trimmed)
		} else {
			clear()
		}
	}, [debouncedQuery, search, clear])

	const isSearching = useMemo(
		() => debouncedQuery.trim().length > 0,
		[debouncedQuery]
	)

	const handleClearSearch = () => {
		setSearchQuery('')
		setDebouncedQuery('')
		clear()
	}

	const renderDefaultContent = () => {
		if (loading) {
			return (
				<View
					style={{
						flex: 1,
						alignItems: 'center',
						justifyContent: 'center',
						paddingVertical: responsive.getResponsivePadding().vertical,
					}}>
					<ActivityIndicator
						size="large"
						color={colors.primary}
					/>
					<Text style={customerMenuStyles.containerSubtext}>
						Loading menu...
					</Text>
				</View>
			)
		}

		if (error || !data?.cafeterias) {
			return (
				<View
					style={{
						alignItems: 'center',
						paddingVertical: responsive.getResponsivePadding().vertical,
					}}>
					<Text style={customerMenuStyles.containerText}>Error</Text>
					<Text style={customerMenuStyles.containerSubtext}>
						{error || 'Unable to load menu'}
					</Text>
				</View>
			)
		}

		if (data.cafeterias.length === 0) {
			return (
				<View
					style={{
						alignItems: 'center',
						paddingVertical: responsive.getResponsivePadding().vertical,
					}}>
					<Text style={customerMenuStyles.containerText}>
						No Cafeterias Available
					</Text>
					<Text style={customerMenuStyles.containerSubtext}>
						Check back later for available cafeterias
					</Text>
				</View>
			)
		}

		return (
			<View>
				{data.cafeterias.map((cafeteria: CafeteriaWithConcessions) => (
					<CafeteriaSection
						key={cafeteria.id}
						cafeteria={cafeteria}
					/>
				))}
			</View>
		)
	}

	const renderSearchResults = () => {
		return (
			<View style={customerMenuStyles.searchResultsSection}>
				<Text style={customerMenuStyles.searchResultTitle}>Search Results</Text>
				{searchLoading ? (
					<View
						style={{
							alignItems: 'center',
							paddingVertical: responsive.getResponsivePadding().vertical,
						}}>
						<ActivityIndicator
							size="large"
							color={colors.primary}
						/>
						<Text style={customerMenuStyles.containerSubtext}>
							Searching...
						</Text>
					</View>
				) : searchError ? (
					<Text style={customerMenuStyles.searchResultEmpty}>
						{searchError}
					</Text>
				) : searchResults.length === 0 ? (
					<Text style={customerMenuStyles.searchResultEmpty}>
						No items match your search.
					</Text>
				) : (
					<View>
						{searchResults.map((item) => (
							<MenuItemListItem
								key={item.id}
								item={item}
								onPress={() =>
									navigation.navigate('MenuItemView', { menuItemId: item.id })
								}
							/>
						))}
					</View>
				)}
			</View>
		)
	}

	return (
		<DynamicKeyboardView useSafeArea={true}>
			<DynamicScrollView
				styles={customerMenuStyles.container}
				showsVerticalScrollIndicator={true}>
				<View style={customerMenuStyles.searchSection}>
					<View style={customerMenuStyles.searchInputWrapper}>
						<Ionicons
							name="search"
							size={responsive.getResponsiveFontSize(18)}
							color={colors.textSecondary}
							style={customerMenuStyles.searchIcon}
						/>
						<TextInput
							value={searchQuery}
							onChangeText={setSearchQuery}
							placeholder="Search menu items"
							placeholderTextColor={colors.textSecondary}
							style={customerMenuStyles.searchInput}
							returnKeyType="search"
						/>
						{searchQuery.length > 0 && (
							<TouchableOpacity
								onPress={handleClearSearch}
								style={customerMenuStyles.clearButton}
								accessibilityLabel="Clear search">
								<Text style={customerMenuStyles.clearButtonText}>Clear</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>

				{isSearching ? renderSearchResults() : renderDefaultContent()}
			</DynamicScrollView>
		</DynamicKeyboardView>
	)
}

export default MenuScreen
