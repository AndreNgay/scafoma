import React, { useEffect, useState } from 'react'
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	ActivityIndicator,
	Button,
	TouchableOpacity,
	Platform,
	ScrollView,
	Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import useStore from '../../../store'
import api from '../../../libs/apiCall'
import { useToast } from '../../../contexts/ToastContext'

interface CartItem {
	order_id: number
	order_detail_id: number
	item_name: string
	quantity: number
	order_detail_total: number
	cafeteria_name: string
	concession_name: string
	variations?: string[]
}

interface GroupedCart {
	orderId: number
	concessionName: string
	cafeteriaName: string
	items: CartItem[]
	total: number
}

const Cart = ({ navigation }: any) => {
	const { user } = useStore()
	const [cartItems, setCartItems] = useState<CartItem[]>([])
	const [groupedCarts, setGroupedCarts] = useState<GroupedCart[]>([])
	const [loading, setLoading] = useState(true)
	const [scheduleTimes, setScheduleTimes] = useState<
		Record<number, Date | null>
	>({})
	const [activeOrderId, setActiveOrderId] = useState<number | null>(null)
	const [showDatePicker, setShowDatePicker] = useState(false)
	const [showTimePicker, setShowTimePicker] = useState(false)
	const [updatingItemId, setUpdatingItemId] = useState<number | null>(null)
	const [removeModalVisible, setRemoveModalVisible] = useState(false)
	const [itemToRemove, setItemToRemove] = useState<{
		id: number
		name: string
	} | null>(null)
	const [removeGroupModalVisible, setRemoveGroupModalVisible] = useState(false)
	const [groupToRemove, setGroupToRemove] = useState<{
		orderId: number
		concessionName: string
	} | null>(null)
	const { showToast } = useToast()

	const fetchCart = async () => {
		if (!user) return
		try {
			setLoading(true)
			const res = await api.get(`/order/cart/${user.id}`)
			const newCartItems: CartItem[] = res.data || []

			setCartItems(newCartItems)

			// Group items by order_id (each order = one concession)
			const grouped: Record<number, GroupedCart> = {}

			newCartItems.forEach((item) => {
				if (!grouped[item.order_id]) {
					grouped[item.order_id] = {
						orderId: item.order_id,
						concessionName: item.concession_name,
						cafeteriaName: item.cafeteria_name,
						items: [],
						total: 0,
					}
				}
				grouped[item.order_id].items.push(item)
				grouped[item.order_id].total += Number(item.order_detail_total)
			})

			setGroupedCarts(Object.values(grouped))
		} catch (err) {
			console.error('Error fetching cart:', err)
		} finally {
			setLoading(false)
		}
	}

	const updateQuantity = async (orderDetailId: number, newQty: number) => {
		if (newQty < 1) return
		try {
			setUpdatingItemId(orderDetailId)
			await api.put(`/order-detail/${orderDetailId}/quantity`, {
				quantity: newQty,
			})
			await fetchCart()
		} catch (err) {
			console.error('Error updating quantity:', err)
			showToast('error', 'Failed to update quantity. Please try again.')
		} finally {
			setUpdatingItemId(null)
		}
	}

	const removeItem = async (orderDetailId: number) => {
		try {
			setUpdatingItemId(orderDetailId)
			await api.delete(`/order-detail/${orderDetailId}`)
			await fetchCart()
		} catch (err) {
			console.error('Error removing item:', err)
			showToast('error', 'Failed to remove item. Please try again.')
		} finally {
			setUpdatingItemId(null)
		}
	}

	const confirmRemoveItem = (itemName: string, orderDetailId: number) => {
		setItemToRemove({ id: orderDetailId, name: itemName })
		setRemoveModalVisible(true)
	}

	const cancelRemoveItem = () => {
		setRemoveModalVisible(false)
		setItemToRemove(null)
	}

	const confirmRemoveItemProceed = async () => {
		if (!itemToRemove) return
		setRemoveModalVisible(false)
		await removeItem(itemToRemove.id)
		setItemToRemove(null)
	}

	const confirmRemoveGroup = (orderId: number, concessionName: string) => {
		setGroupToRemove({ orderId, concessionName })
		setRemoveGroupModalVisible(true)
	}

	const cancelRemoveGroup = () => {
		setRemoveGroupModalVisible(false)
		setGroupToRemove(null)
	}

	const confirmRemoveGroupProceed = async () => {
		if (!groupToRemove) return
		setRemoveGroupModalVisible(false)
		
		try {
			// Delete the entire order (which removes all items in that concession)
			await api.delete(`/order/${groupToRemove.orderId}`)
			showToast('success', `Removed all items from ${groupToRemove.concessionName}`)
			await fetchCart()
		} catch (err) {
			console.error('Error removing group:', err)
			showToast('error', 'Failed to remove items. Please try again.')
		} finally {
			setGroupToRemove(null)
		}
	}

	useEffect(() => {
		const unsubscribe = navigation.addListener('focus', fetchCart)
		return unsubscribe
	}, [navigation, user?.id])

	const handleDateChange = (event: any, selectedDate?: Date) => {
		setShowDatePicker(false)
		if (Platform.OS === 'android' && event?.type === 'dismissed') return
		if (!selectedDate || !activeOrderId) return

		const currentTime = scheduleTimes[activeOrderId]
		if (currentTime) {
			const newDateTime = new Date(selectedDate)
			newDateTime.setHours(currentTime.getHours())
			newDateTime.setMinutes(currentTime.getMinutes())
			newDateTime.setSeconds(0)
			newDateTime.setMilliseconds(0)
			setScheduleTimes((prev) => ({ ...prev, [activeOrderId]: newDateTime }))
		} else {
			const newDateTime = new Date(selectedDate)
			newDateTime.setHours(new Date().getHours())
			newDateTime.setMinutes(new Date().getMinutes())
			newDateTime.setSeconds(0)
			newDateTime.setMilliseconds(0)
			setScheduleTimes((prev) => ({ ...prev, [activeOrderId]: newDateTime }))
		}
	}

	const handleTimeChange = (event: any, selectedTime?: Date) => {
		setShowTimePicker(false)
		if (Platform.OS === 'android' && event?.type === 'dismissed') return
		if (!selectedTime || !activeOrderId) return

		const baseDate = scheduleTimes[activeOrderId] || new Date()
		const combinedDateTime = new Date(baseDate)
		combinedDateTime.setHours(selectedTime.getHours())
		combinedDateTime.setMinutes(selectedTime.getMinutes())
		combinedDateTime.setSeconds(0)
		combinedDateTime.setMilliseconds(0)
		setScheduleTimes((prev) => ({ ...prev, [activeOrderId]: combinedDateTime }))
	}

	const clearScheduleTime = (orderId: number) => {
		setScheduleTimes((prev) => {
			const updated = { ...prev }
			delete updated[orderId]
			return updated
		})
	}

	const checkoutSingleOrder = async (
		orderId: number,
		concessionName: string
	) => {
		try {
			const scheduleTime = scheduleTimes[orderId]

			if (scheduleTime && scheduleTime <= new Date()) {
				showToast(
					'error',
					'Please select a future date and time for scheduling.'
				)
				return
			}

			const checkoutData: any = { order_id: orderId }

			if (scheduleTime) {
				checkoutData.schedule_time = scheduleTime.toISOString()
			}

			const response = await api.put(`/order/checkout-single`, checkoutData)
			let message = `Order placed for ${concessionName}!`

			if (scheduleTime) {
				message += `\n\nScheduled for: ${scheduleTime.toLocaleString()}`
			}

			showToast('success', message)

			// Clear schedule time for this order
			setScheduleTimes((prev) => {
				const updated = { ...prev }
				delete updated[orderId]
				return updated
			})

			// Refresh cart
			await fetchCart()

			// Navigate to view order after delay
			setTimeout(() => {
				if (response.data?.order?.id) {
					navigation.navigate('Orders', {
						screen: 'View Order',
						params: { orderId: response.data.order.id },
					})
				}
			}, 1500)
		} catch (err: any) {
			console.error('Checkout failed:', err)
			const errorMessage = err.response?.data?.error || 'Checkout failed'
			showToast('error', errorMessage)
		}
	}

	const renderItem = (item: CartItem) => {
		const isUpdating = updatingItemId === item.order_detail_id

		return (
			<View style={[styles.card, isUpdating && styles.cardUpdating]}>
				{isUpdating && (
					<View style={styles.loadingOverlay}>
						<ActivityIndicator
							size="small"
							color="#A40C2D"
						/>
					</View>
				)}

				<View style={styles.cardHeader}>
					<View style={styles.itemInfo}>
						<Text style={styles.title}>{item.item_name}</Text>
					</View>
				</View>

				<View style={styles.priceRow}>
					<Text style={styles.basePrice}>
						₱{(Number(item.order_detail_total) / item.quantity).toFixed(2)}
					</Text>
					{item.variations && item.variations.length > 0 && (
						<Text style={styles.variationText}>
							{item.variations.join(', ')}
						</Text>
					)}
				</View>

				<View style={styles.bottomRow}>
					<View style={styles.quantityRow}>
						<TouchableOpacity
							onPress={() =>
								updateQuantity(item.order_detail_id, item.quantity - 1)
							}
							style={[
								styles.qtyBtn,
								item.quantity <= 1 && styles.qtyBtnDisabled,
							]}
							disabled={isUpdating || item.quantity <= 1}>
							<Text
								style={[
									styles.qtyBtnText,
									item.quantity <= 1 && styles.qtyBtnTextDisabled,
								]}>
								−
							</Text>
						</TouchableOpacity>
						<View style={styles.qtyBox}>
							<Text style={styles.qtyText}>{item.quantity}</Text>
						</View>
						<TouchableOpacity
							onPress={() =>
								updateQuantity(item.order_detail_id, item.quantity + 1)
							}
							style={styles.qtyBtn}
							disabled={isUpdating}>
							<Text style={styles.qtyBtnText}>+</Text>
						</TouchableOpacity>
					</View>

					<View style={styles.subtotalContainer}>
						<Text style={styles.subtotalLabel}>Subtotal</Text>
						<Text style={styles.subtotal}>
							₱{Number(item.order_detail_total).toFixed(2)}
						</Text>
					</View>
				</View>

				<TouchableOpacity
					onPress={() =>
						confirmRemoveItem(item.item_name, item.order_detail_id)
					}
					style={styles.removeBtn}
					disabled={isUpdating}>
					<Text style={styles.removeBtnText}>
						<Ionicons
							name="trash-outline"
							size={14}
							color="#ff4444"
						/>{' '}
						Remove
					</Text>
				</TouchableOpacity>
			</View>
		)
	}

	const itemCount = cartItems.length

	return (
		<View style={styles.container}>
			<View style={styles.headerContainer}>
				<Text style={styles.header}>My Cart</Text>
				{cartItems.length > 0 && (
					<View style={styles.headerBadge}>
						<Text style={styles.headerBadgeText}>
							{itemCount} {itemCount === 1 ? 'item' : 'items'}
						</Text>
					</View>
				)}
			</View>

			{loading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator
						size="large"
						color="#A40C2D"
					/>
					<Text style={styles.loadingText}>Loading your cart...</Text>
				</View>
			) : cartItems.length === 0 ? (
				<View style={styles.emptyContainer}>
					<Ionicons
						name="cart-outline"
						size={64}
						color="#d1d5db"
					/>
					<Text style={styles.emptyText}>Your cart is empty</Text>
					<Text style={styles.emptySubtext}>
						Add items from the menu to get started
					</Text>
				</View>
			) : (
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{ paddingBottom: 20 }}>
					{groupedCarts.map((group) => (
						<View
							key={group.orderId}
							style={styles.concessionGroup}>
							{/* Concession Header */}
							<View style={styles.concessionHeader}>
								<View style={{ flex: 1 }}>
									<Text style={styles.concessionHeaderName}>
										{group.concessionName}
									</Text>
									<Text style={styles.concessionHeaderCafeteria}>
										{group.cafeteriaName}
									</Text>
								</View>
								<View style={styles.concessionHeaderRight}>
									<View style={styles.concessionHeaderBadge}>
										<Text style={styles.concessionHeaderBadgeText}>
											{group.items.length}{' '}
											{group.items.length === 1 ? 'item' : 'items'}
										</Text>
									</View>
									<TouchableOpacity
										onPress={() => confirmRemoveGroup(group.orderId, group.concessionName)}
										style={styles.removeGroupBtn}>
										<Ionicons name="trash-outline" size={18} color="#ff4444" />
									</TouchableOpacity>
								</View>
							</View>

							{/* Items in this concession */}
							{group.items.map((item) => (
								<View key={item.order_detail_id}>{renderItem(item)}</View>
							))}

							{/* Schedule Time for this concession */}
							<View style={styles.scheduleContainer}>
								<Text style={styles.scheduleTitle}>
									Schedule Pickup (Optional)
								</Text>
								<Text style={styles.scheduleSubtitle}>
									Order ahead for bulk orders or future pickup
								</Text>

								<View style={styles.scheduleButtons}>
									<TouchableOpacity
										style={styles.scheduleBtn}
										onPress={() => {
											setActiveOrderId(group.orderId)
											setShowDatePicker(true)
										}}>
										<Text style={styles.scheduleBtnText}>
											<Ionicons
												name="calendar-outline"
												size={14}
												color="#A40C2D"
											/>{' '}
											Select Date
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={styles.scheduleBtn}
										onPress={() => {
											setActiveOrderId(group.orderId)
											setShowTimePicker(true)
										}}>
										<Text style={styles.scheduleBtnText}>
											<Ionicons
												name="time-outline"
												size={14}
												color="#A40C2D"
											/>{' '}
											Select Time
										</Text>
									</TouchableOpacity>
								</View>

								{scheduleTimes[group.orderId] && (
									<View style={styles.scheduledTimeContainer}>
										<Text style={styles.scheduledTimeText}>
											<Ionicons
												name="calendar-outline"
												size={14}
												color="#28a745"
											/>{' '}
											Scheduled for:{' '}
											{scheduleTimes[group.orderId]?.toLocaleString()}
										</Text>
										<TouchableOpacity
											onPress={() => clearScheduleTime(group.orderId)}
											style={styles.clearScheduleBtn}>
											<Text style={styles.clearScheduleText}>Clear</Text>
										</TouchableOpacity>
									</View>
								)}
							</View>

							{/* Checkout button for this concession */}
							<TouchableOpacity
								style={styles.checkoutBtn}
								onPress={() =>
									checkoutSingleOrder(group.orderId, group.concessionName)
								}
								activeOpacity={0.8}>
								<Text style={styles.checkoutBtnText}>
									<Ionicons
										name={
											scheduleTimes[group.orderId]
												? 'calendar-outline'
												: 'bag-check-outline'
										}
										size={16}
										color="#fff"
									/>{' '}
									{scheduleTimes[group.orderId]
										? 'Schedule Order'
										: 'Place Order'}
								</Text>
								<Text style={styles.checkoutBtnAmount}>
									₱{group.total.toFixed(2)}
								</Text>
							</TouchableOpacity>
						</View>
					))}
				</ScrollView>
			)}

			{/* Date Picker */}
			{showDatePicker && activeOrderId && (
				<DateTimePicker
					value={scheduleTimes[activeOrderId] || new Date()}
					mode="date"
					display={Platform.OS === 'ios' ? 'spinner' : 'default'}
					onChange={handleDateChange}
					minimumDate={new Date()}
				/>
			)}

			{/* Time Picker */}
			{showTimePicker && activeOrderId && (
				<DateTimePicker
					value={scheduleTimes[activeOrderId] || new Date()}
					mode="time"
					display={Platform.OS === 'ios' ? 'spinner' : 'default'}
					onChange={handleTimeChange}
				/>
			)}

			<Modal
				visible={removeModalVisible}
				animationType="slide"
				transparent={true}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContainer}>
						<Text style={styles.modalHeader}>Remove Item</Text>
						<Text style={styles.modalSubtitle}>
							{itemToRemove
								? `Are you sure you want to remove "${itemToRemove.name}" from your cart?`
								: 'Are you sure you want to remove this item from your cart?'}
						</Text>

						<View style={styles.modalButtonRow}>
							<TouchableOpacity
								style={styles.cancelModalBtn}
								onPress={cancelRemoveItem}
								disabled={updatingItemId !== null}>
								<Text style={styles.cancelModalText}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.submitRemoveBtn}
								onPress={confirmRemoveItemProceed}
								disabled={updatingItemId !== null}>
								<Text style={styles.submitRemoveText}>
									{updatingItemId !== null ? 'Removing...' : 'Remove'}
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			<Modal
				visible={removeGroupModalVisible}
				animationType="slide"
				transparent={true}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContainer}>
						<Text style={styles.modalHeader}>Remove All Items</Text>
						<Text style={styles.modalSubtitle}>
							{groupToRemove
								? `Are you sure you want to remove ALL items from "${groupToRemove.concessionName}"?`
								: 'Are you sure you want to remove all items from this concession?'}
						</Text>

						<View style={styles.modalButtonRow}>
							<TouchableOpacity
								style={styles.cancelModalBtn}
								onPress={cancelRemoveGroup}>
								<Text style={styles.cancelModalText}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.submitRemoveBtn}
								onPress={confirmRemoveGroupProceed}>
								<Text style={styles.submitRemoveText}>Remove All</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
		padding: 15,
	},
	concessionGroup: {
		backgroundColor: '#fff',
		borderRadius: 12,
		marginBottom: 16,
		padding: 12,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},
	concessionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
		paddingBottom: 12,
		borderBottomWidth: 2,
		borderBottomColor: '#A40C2D',
	},
	concessionHeaderName: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#A40C2D',
	},
	concessionHeaderCafeteria: {
		fontSize: 13,
		color: '#666',
		marginTop: 2,
	},
	concessionHeaderRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	concessionHeaderBadge: {
		backgroundColor: '#A40C2D',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
	},
	concessionHeaderBadgeText: {
		color: '#fff',
		fontSize: 11,
		fontWeight: '600',
	},
	removeGroupBtn: {
		backgroundColor: '#fff',
		padding: 8,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#ff4444',
	},
	headerContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 15,
	},
	header: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#A40C2D',
	},
	headerBadge: {
		backgroundColor: '#A40C2D',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
	},
	headerBadgeText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '600',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		marginTop: 10,
		color: '#666',
		fontSize: 14,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 40,
	},
	emptyIcon: {
		fontSize: 64,
		marginBottom: 16,
	},
	emptyIconImage: {
		width: 64,
		height: 64,
		marginBottom: 16,
	},
	emptyText: {
		textAlign: 'center',
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	emptySubtext: {
		textAlign: 'center',
		fontSize: 14,
		color: '#888',
	},
	card: {
		backgroundColor: '#f8f9fa',
		padding: 12,
		borderRadius: 8,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#e0e0e0',
	},
	cardUpdating: {
		opacity: 0.6,
	},
	loadingOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(255, 255, 255, 0.8)',
		borderRadius: 12,
		zIndex: 10,
	},
	cardHeader: {
		marginBottom: 12,
	},
	itemInfo: {
		flex: 1,
	},
	title: {
		fontSize: 17,
		fontWeight: '700',
		color: '#1a1a1a',
		marginBottom: 4,
	},
	concession: {
		fontSize: 13,
		color: '#666',
	},
	priceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	basePrice: {
		fontSize: 16,
		fontWeight: '600',
		color: '#A40C2D',
		marginRight: 8,
	},
	variationText: {
		fontSize: 12,
		color: '#888',
		fontStyle: 'italic',
	},
	bottomRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	quantityRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	qtyBtn: {
		backgroundColor: '#f0f0f0',
		width: 36,
		height: 36,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#ddd',
	},
	qtyBtnDisabled: {
		backgroundColor: '#f8f8f8',
		borderColor: '#e8e8e8',
	},
	qtyBtnText: {
		fontSize: 20,
		fontWeight: '600',
		color: '#A40C2D',
	},
	qtyBtnTextDisabled: {
		color: '#ccc',
	},
	qtyBox: {
		minWidth: 40,
		paddingHorizontal: 12,
		alignItems: 'center',
	},
	qtyText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
	},
	subtotalContainer: {
		alignItems: 'flex-end',
	},
	subtotalLabel: {
		fontSize: 12,
		color: '#888',
		marginBottom: 2,
	},
	subtotal: {
		fontSize: 18,
		fontWeight: '700',
		color: '#A40C2D',
	},
	removeBtn: {
		backgroundColor: '#fff',
		padding: 10,
		borderRadius: 8,
		alignSelf: 'flex-start',
		borderWidth: 1,
		borderColor: '#ff4444',
	},
	removeBtnText: {
		color: '#ff4444',
		fontSize: 13,
		fontWeight: '600',
	},
	summaryContainer: {
		backgroundColor: '#f8f9fa',
		padding: 12,
		borderRadius: 8,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	summaryLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
	},
	summaryTotal: {
		fontSize: 18,
		fontWeight: '700',
		color: '#A40C2D',
	},
	scheduleContainer: {
		backgroundColor: '#f8f9fa',
		padding: 12,
		borderRadius: 8,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	scheduleTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#A40C2D',
		marginBottom: 5,
	},
	scheduleSubtitle: {
		fontSize: 12,
		color: '#666',
		marginBottom: 15,
	},
	scheduleButtons: {
		flexDirection: 'row',
		gap: 10,
	},
	scheduleBtn: {
		flex: 1,
		backgroundColor: '#fff',
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#ddd',
		alignItems: 'center',
	},
	scheduleBtnText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#A40C2D',
	},
	inlineIcon: {
		width: 14,
		height: 14,
		marginRight: 6,
	},
	activeScheduleBtn: {
		backgroundColor: '#A40C2D',
		borderColor: '#A40C2D',
	},
	activeScheduleBtnText: {
		color: '#fff',
	},
	scheduledTimeContainer: {
		backgroundColor: '#e8f5e8',
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#28a745',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 12,
	},
	scheduledTimeText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#28a745',
		flex: 1,
	},
	clearScheduleBtn: {
		backgroundColor: '#dc3545',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 4,
	},
	clearScheduleText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '500',
	},
	checkoutBtn: {
		backgroundColor: '#A40C2D',
		padding: 14,
		borderRadius: 8,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		shadowColor: '#A40C2D',
		shadowOpacity: 0.2,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
	},
	checkoutBtnText: {
		color: '#fff',
		fontSize: 15,
		fontWeight: '600',
	},
	checkoutBtnAmount: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContainer: {
		backgroundColor: '#fff',
		borderRadius: 10,
		padding: 20,
		margin: 20,
		maxHeight: '80%',
		width: '90%',
	},
	modalHeader: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#A40C2D',
		marginBottom: 10,
		textAlign: 'center',
	},
	modalSubtitle: {
		fontSize: 14,
		color: '#666',
		marginBottom: 20,
		textAlign: 'center',
	},
	modalButtonRow: {
		flexDirection: 'row',
		marginTop: 20,
		gap: 10,
	},
	cancelModalBtn: {
		flex: 1,
		backgroundColor: '#ccc',
		padding: 12,
		borderRadius: 8,
		alignItems: 'center',
	},
	cancelModalText: {
		color: '#fff',
		fontWeight: '600',
	},
	submitRemoveBtn: {
		flex: 1,
		backgroundColor: '#dc3545',
		padding: 12,
		borderRadius: 8,
		alignItems: 'center',
	},
	submitRemoveText: {
		color: '#fff',
		fontWeight: '600',
	},
})

export default Cart
