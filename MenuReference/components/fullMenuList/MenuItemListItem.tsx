import React from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useThemeContext } from '../../../../context'
import { useResponsiveDimensions } from '../../../../hooks'
import { createCustomerFullMenuStyles } from '../../../../styles/customer'
import type { ConcessionMenuItemListItem } from '../../../../types'

interface MenuItemListItemProps {
	item: ConcessionMenuItemListItem
	onPress: () => void
}

const MenuItemListItem: React.FC<MenuItemListItemProps> = ({
	item,
	onPress,
}) => {
	const { colors } = useThemeContext()
	const responsive = useResponsiveDimensions()
	const styles = createCustomerFullMenuStyles(colors, responsive)

	return (
		<TouchableOpacity
			style={[
				styles.listItemContainer,
				!item.availability && styles.listItemDisabled,
			]}
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={`View details for ${item.name}`}
			accessibilityHint="Opens the menu item details screen">
			<View style={styles.listItemImageWrapper}>
				{item.imageToDisplay ? (
					<Image
						source={{ uri: item.imageToDisplay }}
						style={styles.listItemImage}
						resizeMode="cover"
					/>
				) : (
					<View style={styles.listItemImagePlaceholder}>
						<Ionicons
							name="fast-food-outline"
							size={responsive.getResponsiveFontSize(20)}
							color={colors.textSecondary}
						/>
					</View>
				)}
			</View>

			<View style={styles.listItemContent}>
				<View style={styles.listItemHeaderRow}>
					<Text style={styles.listItemName}>{item.name}</Text>
					<Text style={styles.listItemPrice}>{item.priceDisplay}</Text>
				</View>

				{item.description ? (
					<Text
						style={styles.listItemDescription}
						numberOfLines={2}>
						{item.description}
					</Text>
				) : null}

				{item.category ? (
					<Text style={styles.listItemCategory}>
						Category: {item.category.name}
					</Text>
				) : null}

				<View style={styles.listItemFooter}>
					<View
						style={[
							styles.statusBadge,
							item.availability
								? styles.statusBadgeAvailable
								: styles.statusBadgeUnavailable,
						]}>
						<Text
							style={[
								styles.statusBadgeText,
								item.availability
									? styles.statusBadgeTextAvailable
									: styles.statusBadgeTextUnavailable,
							]}>
							{item.availability ? 'Available' : 'Unavailable'}
						</Text>
					</View>
				</View>
			</View>
		</TouchableOpacity>
	)
}

export default MenuItemListItem
