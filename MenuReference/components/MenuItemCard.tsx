import React from 'react'
import { View, Text, Image, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useThemeContext } from '../../../context'
import { useResponsiveDimensions } from '../../../hooks'
import { createCustomerMenuStyles } from '../../../styles/customer'
import { CustomerStackParamList } from '../../../types/navigation'
import type { MenuItemForCustomer } from '../../../types'

type NavigationProp = StackNavigationProp<CustomerStackParamList>

interface MenuItemCardProps {
	item: MenuItemForCustomer
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item }) => {
	const { colors } = useThemeContext()
	const responsive = useResponsiveDimensions()
	const styles = createCustomerMenuStyles(colors, responsive)
	const navigation = useNavigation<NavigationProp>()

	const handlePress = () => {
		navigation.navigate('MenuItemView', { menuItemId: item.id })
	}

	// Get the display image (use displayImageIndex or first image)
	const displayImage =
		item.images.length > 0 ? item.images[item.displayImageIndex || 0] : null

	return (
		<TouchableOpacity
			style={styles.menuItemCard}
			onPress={handlePress}>
			<View style={styles.menuItemImageContainer}>
				{displayImage ? (
					<Image
						source={{ uri: displayImage }}
						style={styles.menuItemImage}
					/>
				) : (
					<View style={styles.menuItemImage} />
				)}
			</View>
			<Text
				style={styles.menuItemName}
				numberOfLines={2}>
				{item.name}
			</Text>
			<Text style={styles.menuItemPrice}>₱{item.basePrice.toFixed(2)}</Text>
		</TouchableOpacity>
	)
}

export default MenuItemCard
