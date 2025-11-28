import React, { useMemo, useRef } from 'react'
import { View, Text, Image, ScrollView, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useThemeContext } from '../../../context'
import { useResponsiveDimensions } from '../../../hooks'
import { createCustomerMenuStyles } from '../../../styles/customer'
import { CustomerStackParamList } from '../../../types/navigation'
import { isConcessionOpenNow } from '../../../utils'
import MenuItemCard from './MenuItemCard'
import type { ConcessionWithMenuItems } from '../../../types'

type NavigationProp = StackNavigationProp<CustomerStackParamList>

interface ConcessionCardProps {
	concession: ConcessionWithMenuItems
}

const ConcessionCard: React.FC<ConcessionCardProps> = ({ concession }) => {
	const { colors } = useThemeContext()
	const responsive = useResponsiveDimensions()
	const styles = createCustomerMenuStyles(colors, responsive)
	const navigation = useNavigation<NavigationProp>()
	const scrollViewRef = useRef<ScrollView>(null)

	const isActuallyOpen = useMemo(
		() => isConcessionOpenNow(concession.is_open, concession.schedule),
		[concession.is_open, concession.schedule]
	)

	const handleViewAll = () => {
		navigation.navigate('FullMenuList', {
			concessionId: concession.id,
			concessionName: concession.name,
		})
	}

	return (
		<View style={styles.concessionCard}>
			<View style={styles.concessionHeader}>
				{concession.image_url && (
					<Image
						source={{ uri: concession.image_url }}
						style={styles.concessionImage}
					/>
				)}
				<View style={styles.concessionInfo}>
					<Text style={styles.concessionName}>{concession.name}</Text>
					<Text
						style={
							isActuallyOpen
								? styles.concessionStatus
								: styles.concessionClosedStatus
						}>
						{isActuallyOpen ? 'Open' : 'Closed'}
					</Text>
				</View>
			</View>

			{/* Show menu items if open, otherwise show closed message */}
			{isActuallyOpen ? (
				concession.menuItems.length > 0 ? (
					<ScrollView
						ref={scrollViewRef}
						horizontal
						showsHorizontalScrollIndicator={true}
						contentContainerStyle={styles.menuItemsContainer}>
						{concession.menuItems.map((item) => (
							<MenuItemCard
								key={item.id}
								item={item}
							/>
						))}

						<TouchableOpacity
							style={styles.viewAllButton}
							onPress={handleViewAll}>
							<Text style={styles.viewAllText}>View All</Text>
						</TouchableOpacity>
					</ScrollView>
				) : (
					<View style={styles.closedMessage}>
						<Text style={styles.closedMessageText}>
							No available menu items at the moment
						</Text>
					</View>
				)
			) : (
				<View style={styles.closedMessage}>
					<Text style={styles.closedMessageText}>
						This concession is currently closed
					</Text>
				</View>
			)}
		</View>
	)
}

export default ConcessionCard
