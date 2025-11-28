import React, { useEffect, useState } from 'react'
import {
	View,
	Text,
	StyleSheet,
	ActivityIndicator,
	FlatList,
	Image,
	ScrollView,
	TouchableOpacity,
	Modal,
	TextInput,
	RefreshControl,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import Checkbox from 'expo-checkbox'
import api from '../../../libs/apiCall'
import { useToast } from '../../../contexts/ToastContext'
import ImagePreviewModal from '../../../components/ImagePreviewModal'

const ViewOrderConcessionaire = () => {
	const route = useRoute<any>()
	const navigation = useNavigation<any>()
	const { orderId } = route.params

	const [order, setOrder] = useState<any>(null)
	const [loading, setLoading] = useState(false)
	const [refreshing, setRefreshing] = useState(false)
	const [updatingStatus, setUpdatingStatus] = useState(false)
	const [declineModalVisible, setDeclineModalVisible] = useState(false)
	const [selectedReason, setSelectedReason] = useState<string>('')
	const [customReason, setCustomReason] = useState<string>('')
	const [itemsToToggle, setItemsToToggle] = useState<Record<number, boolean>>(
		{}
	)
	const [variationsToToggle, setVariationsToToggle] = useState<
		Record<number, boolean>
	>({})
	const [acceptModalVisible, setAcceptModalVisible] = useState(false)
	const [adjustedTotal, setAdjustedTotal] = useState<string>('')
	const [priceReason, setPriceReason] = useState<string>('')
	const [customPriceReason, setCustomPriceReason] = useState<string>('')
	const [previewSource, setPreviewSource] = useState<string | null>(null)
	const [closingConcession, setClosingConcession] = useState(false)
	const [currentTime, setCurrentTime] = useState(Date.now())
	const [rejectingReceipt, setRejectingReceipt] = useState(false)
	const { showToast } = useToast()

	// Format dates with Asia/Manila timezone
	const formatManila = (value: any) => {
		if (!value) return ''
		try {
			if (typeof value === 'string') {
				if (/[zZ]|[+-]\d{2}:?\d{2}/.test(value)) {
					const d = new Date(value)
					return new Intl.DateTimeFormat('en-PH', {
						timeZone: 'Asia/Manila',
						year: 'numeric',
						month: 'short',
						day: '2-digit',
						hour: 'numeric',
						minute: '2-digit',
					}).format(d)
				}
				const cleaned = value.replace('T', ' ')
				const [datePart, timePartFull] = cleaned.split(' ')
				if (!datePart || !timePartFull) return cleaned
				const [year, month, day] = datePart
					.split('-')
					.map((p) => parseInt(p, 10))
				const [hStr, mStr] = timePartFull.split(':')
				if (!year || !month || !day || !hStr || !mStr) return cleaned
				let hour = parseInt(hStr, 10)
				const ampm = hour >= 12 ? 'PM' : 'AM'
				hour = hour % 12
				if (hour === 0) hour = 12
				const monthNames = [
					'Jan',
					'Feb',
					'Mar',
					'Apr',
					'May',
					'Jun',
					'Jul',
					'Aug',
					'Sep',
					'Oct',
					'Nov',
					'Dec',
				]
				return `${
					monthNames[month - 1]
				} ${day}, ${year} ${hour}:${mStr} ${ampm}`
			}
			return new Intl.DateTimeFormat('en-PH', {
				timeZone: 'Asia/Manila',
				year: 'numeric',
				month: 'short',
				day: '2-digit',
				hour: 'numeric',
				minute: '2-digit',
			}).format(new Date(value))
		} catch {
			return String(value)
		}
	}

	// Fetch order details from backend
	const fetchOrderDetails = async (isRefresh = false) => {
		try {
			if (isRefresh) {
				setRefreshing(true)
			} else {
				setLoading(true)
			}
			const res = await api.get(`/order/${orderId}`) // Backend route /order/:id
			setOrder(res.data)
		} catch (err) {
			console.error('Error fetching order details:', err)
			showToast('error', 'Failed to fetch order details')
		} finally {
			if (isRefresh) {
				setRefreshing(false)
			} else {
				setLoading(false)
			}
		}
	}

	useEffect(() => {
		fetchOrderDetails()
	}, [orderId])

	// Update current time every second for timer
	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(Date.now())
		}, 1000)
		return () => clearInterval(interval)
	}, [])

	// Calculate receipt timer
	const calculateTimer = () => {
		if (
			!order ||
			order.payment_method !== 'gcash' ||
			order.order_status !== 'accepted' ||
			!order.accepted_at ||
			!order.receipt_timer
		) {
			return { timeRemaining: null, isExpired: false }
		}

		try {
			const acceptedDate = new Date(order.accepted_at)
			const [hours, minutes, seconds] = order.receipt_timer
				.split(':')
				.map(Number)
			const deadlineMs =
				acceptedDate.getTime() + (hours * 3600 + minutes * 60 + seconds) * 1000
			const remainingMs = deadlineMs - currentTime

			if (remainingMs <= 0) {
				return { timeRemaining: 'Expired', isExpired: true }
			}

			const remainingMinutes = Math.floor(remainingMs / 60000)
			const remainingSeconds = Math.floor((remainingMs % 60000) / 1000)
			return {
				timeRemaining: `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`,
				isExpired: false,
			}
		} catch (e) {
			console.error('Error calculating timer:', e)
			return { timeRemaining: null, isExpired: false }
		}
	}

	// Auto-decline order if timer expires
	useEffect(() => {
		if (!order) return

		const checkExpiration = async () => {
			// Only check GCash orders that are accepted without receipt
			if (
				order.payment_method === 'gcash' &&
				order.order_status === 'accepted' &&
				!order.gcash_screenshot
			) {
				const { isExpired } = calculateTimer()
				if (isExpired) {
					try {
						await api.post(`/order/${order.id}/check-expired`)
						await fetchOrderDetails()
						showToast(
							'error',
							'Order automatically declined: Receipt not uploaded in time'
						)
					} catch (err) {
						console.error('Error auto-declining order:', err)
					}
				}
			}
		}

		checkExpiration()
	}, [currentTime, order?.id, order?.order_status, order?.gcash_screenshot])

	// Update order status
	const updateStatus = async (newStatus: string, declineReason?: string) => {
		if (!order) return
		try {
			setUpdatingStatus(true)
			const requestData: any = { order_status: newStatus }
			if (declineReason) {
				requestData.decline_reason = declineReason
			}
			await api.put(`order/status/${order.id}`, requestData)
			await fetchOrderDetails()
			showToast('success', `Order marked as ${newStatus}`)
		} catch (err) {
			console.error(err)
			showToast('error', 'Failed to update order status')
		} finally {
			setUpdatingStatus(false)
		}
	}

	// Handle decline with reason
	const handleDecline = () => {
		setDeclineModalVisible(true)
	}

	// Submit decline with reason
	const submitDecline = async () => {
		if (!selectedReason && !customReason.trim()) {
			showToast(
				'error',
				'Please select a reason or provide a custom reason for declining this order.'
			)
			return
		}

		const reason =
			selectedReason === 'custom' ? customReason.trim() : selectedReason

		// If "Item not available" is selected, update item availability
		const toggledUnavailableItems: string[] = []
		if (selectedReason === 'Item not available') {
			try {
				const itemsToUpdate = Object.entries(itemsToToggle).filter(
					([_, shouldToggle]) => shouldToggle
				)

				for (const [itemIdStr, _] of itemsToUpdate) {
					const itemId = parseInt(itemIdStr)
					const item = order?.items?.find((i: any) => i.item_id === itemId)

					if (item) {
						// Update availability to false
						await api.put(`/menu-item/${itemId}/availability`, {
							available: false,
						})
						toggledUnavailableItems.push(item.item_name)
					}
				}
			} catch (error) {
				console.error('Error updating item availability:', error)
				showToast('error', 'Failed to update item availability')
				return
			}
		}

		// If "Unavailable options/variations" is selected, update variation availability
		const toggledUnavailableVariations: string[] = []
		if (selectedReason === 'Unavailable options/variations') {
			try {
				const variationsToUpdate = Object.entries(variationsToToggle).filter(
					([_, shouldToggle]) => shouldToggle
				)

				for (const [variationIdStr, _] of variationsToUpdate) {
					const variationId = parseInt(variationIdStr)

					// Update variation availability to false
					await api.put(`/item-variation/${variationId}/availability`, {
						available: false,
					})

					// Find variation name for notification
					let variationName = ''
					for (const item of order?.items || []) {
						for (const v of item.variations || []) {
							if (v.variation_id === variationId) {
								variationName = `${v.group_name}: ${v.variation_name}`
								break
							}
						}
						if (variationName) break
					}
					if (variationName) {
						toggledUnavailableVariations.push(variationName)
					}
				}
			} catch (error) {
				console.error('Error updating variation availability:', error)
				showToast('error', 'Failed to update variation availability')
				return
			}
		}

		// Build decline reason with toggled items/variations info
		let finalReason = reason
		if (toggledUnavailableItems.length > 0) {
			finalReason += `\n\nItems marked as unavailable: ${toggledUnavailableItems.join(
				', '
			)}`
		}
		if (toggledUnavailableVariations.length > 0) {
			finalReason += `\n\nVariations marked as unavailable: ${toggledUnavailableVariations.join(
				', '
			)}`
		}

		await updateStatus('declined', finalReason)
		setDeclineModalVisible(false)
		setSelectedReason('')
		setCustomReason('')
		setItemsToToggle({})
		setVariationsToToggle({})
	}

	// Cancel decline
	const cancelDecline = () => {
		setDeclineModalVisible(false)
		setSelectedReason('')
		setCustomReason('')
		setItemsToToggle({})
		setVariationsToToggle({})
	}

	const openAcceptModal = () => {
		if (!order) return
		const baseTotal =
			(
				order.updated_total_price !== null &&
				order.updated_total_price !== undefined
			) ?
				order.updated_total_price
			:	order.total_price
		const formatted =
			(
				baseTotal !== null &&
				baseTotal !== undefined &&
				!Number.isNaN(Number(baseTotal))
			) ?
				Number(baseTotal).toFixed(2)
			:	''
		setAdjustedTotal(formatted)
		setPriceReason('')
		setCustomPriceReason('')
		setAcceptModalVisible(true)
	}

	const cancelAccept = () => {
		setAcceptModalVisible(false)
		setPriceReason('')
		setCustomPriceReason('')
	}

	const submitAccept = async () => {
		if (!order) return
		const originalTotal = Number(order.total_price ?? 0)
		const trimmed = adjustedTotal.trim()

		let newTotal: number | null = null
		if (trimmed) {
			const parsed = Number(trimmed)
			if (!Number.isFinite(parsed) || parsed < 0) {
				showToast('error', 'Please enter a valid total amount.')
				return
			}
			newTotal = parsed
		}

		const payload: any = { order_status: 'accepted' }

		if (newTotal !== null && newTotal !== originalTotal) {
			if (!priceReason && !customPriceReason.trim()) {
				showToast(
					'error',
					'Please select or enter a reason for changing the total.'
				)
				return
			}
			const reason =
				priceReason === 'custom' ? customPriceReason.trim() : priceReason
			payload.updated_total_price = newTotal
			payload.price_change_reason = reason
		}

		try {
			setUpdatingStatus(true)
			await api.put(`order/status/${order.id}`, payload)
			await fetchOrderDetails()
			showToast('success', 'Order marked as accepted')
			setAcceptModalVisible(false)
		} catch (err) {
			console.error(err)
			showToast('error', 'Failed to update order status')
		} finally {
			setUpdatingStatus(false)
		}
	}

	const onRefresh = () => {
		if (loading) return
		fetchOrderDetails(true)
	}

	// Reject receipt and restart timer
	const rejectReceipt = async () => {
		if (!order) return

		try {
			setRejectingReceipt(true)
			await api.put(`/order/${order.id}/reject-receipt`)
			await fetchOrderDetails()
			showToast('success', 'Receipt rejected. Timer restarted.')
		} catch (err) {
			console.error('Error rejecting receipt:', err)
			showToast('error', 'Failed to reject receipt')
		} finally {
			setRejectingReceipt(false)
		}
	}

	if (loading)
		return (
			<ActivityIndicator
				size="large"
				color="#A40C2D"
				style={{ flex: 1 }}
			/>
		)

	if (!order)
		return (
			<View style={styles.container}>
				<Text style={styles.emptyText}>Order not found</Text>
			</View>
		)

	// Render buttons depending on order status
	const renderStatusButtons = () => {
		if (updatingStatus) return <Text>Updating...</Text>

		switch (order.order_status) {
			case 'pending':
				return (
					<View style={styles.buttonRow}>
						<TouchableOpacity
							style={styles.acceptBtn}
							onPress={openAcceptModal}>
							<Text style={styles.btnText}>Accept</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.declineBtn}
							onPress={handleDecline}>
							<Text style={styles.btnText}>Decline</Text>
						</TouchableOpacity>
					</View>
				)
			case 'accepted':
				return (
					<TouchableOpacity
						style={styles.readyBtn}
						onPress={() => updateStatus('ready for pickup')}>
						<Text style={styles.btnText}>Ready for Pick-up</Text>
					</TouchableOpacity>
				)
			case 'ready for pickup':
				return (
					<TouchableOpacity
						style={styles.completeBtn}
						onPress={() => updateStatus('completed')}>
						<Text style={styles.btnText}>Complete</Text>
					</TouchableOpacity>
				)
			case 'declined':
			case 'completed':
				return (
					<Text style={{ marginTop: 10, fontStyle: 'italic' }}>
						No further actions available
					</Text>
				)
			default:
				return null
		}
	}

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.contentContainer}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={onRefresh}
					tintColor="#A40C2D"
				/>
			}>
			{/* Customer Info Section */}
			<TouchableOpacity
				style={styles.customerSection}
				onPress={() =>
					navigation.navigate('View Customer Profile', {
						customerId: order.customer_id,
					})
				}>
				{order.customer_profile_image ?
					<Image
						source={{ uri: order.customer_profile_image }}
						style={styles.customerAvatar}
					/>
				:	<View style={styles.customerAvatarPlaceholder}>
						<Text style={styles.customerInitials}>
							{order.customer_first_name?.[0]}
							{order.customer_last_name?.[0]}
						</Text>
					</View>
				}
				<View style={styles.customerInfo}>
					<Text style={styles.customerName}>
						{order.customer_first_name} {order.customer_last_name}
					</Text>
					<Text style={styles.customerEmail}>{order.customer_email}</Text>
				</View>
			</TouchableOpacity>

			<Text style={styles.header}>Order #{order.id}</Text>

			{/* Order Status & Basic Info */}
			<View style={styles.sectionCard}>
				<Text style={styles.sectionTitle}>
					<Ionicons
						name="clipboard-outline"
						size={16}
						color="#A40C2D"
						style={styles.inlineIcon}
					/>{' '}
					Order Details
				</Text>
				<View style={styles.infoSection}>
					<Text style={styles.infoLabel}>Status:</Text>
					<Text style={[styles.status, styles.statusText]}>
						{order.order_status}
					</Text>
				</View>
				<View style={styles.infoSection}>
					<Text style={styles.infoLabel}>Order Date:</Text>
					<Text style={styles.infoValue}>{formatManila(order.created_at)}</Text>
				</View>
				{order.schedule_time && (
					<View style={styles.infoSection}>
						<Text style={styles.infoLabel}>Scheduled for:</Text>
						<Text style={[styles.infoValue, styles.scheduleTime]}>
							<Ionicons
								name="time-outline"
								size={14}
								color="#28a745"
								style={styles.inlineIcon}
							/>{' '}
							{formatManila(order.schedule_time)}
						</Text>
					</View>
				)}
				{order.note && (
					<View style={styles.infoSection}>
						<Text style={styles.infoLabel}>Note:</Text>
						<Text style={styles.infoValue}>{order.note}</Text>
					</View>
				)}
			</View>

			{/* Pricing Information */}
			<View style={styles.sectionCard}>
				<Text style={styles.sectionTitle}>
					<Ionicons
						name="pricetag-outline"
						size={16}
						color="#A40C2D"
						style={styles.inlineIcon}
					/>{' '}
					Pricing
				</Text>
				{(
					order.updated_total_price !== null &&
					order.updated_total_price !== undefined &&
					!Number.isNaN(Number(order.updated_total_price)) &&
					!Number.isNaN(Number(order.total_price)) &&
					Number(order.updated_total_price) !== Number(order.total_price)
				) ?
					<>
						<View style={styles.infoSection}>
							<Text style={styles.infoLabel}>Original Total:</Text>
							<Text style={styles.infoValue}>
								₱{Number(order.total_price).toFixed(2)}
							</Text>
						</View>
						<View style={styles.infoSection}>
							<Text style={styles.infoLabel}>Updated Total:</Text>
							<Text style={[styles.infoValue, styles.updatedPrice]}>
								₱{Number(order.updated_total_price).toFixed(2)}
							</Text>
						</View>
						{order.price_change_reason && (
							<View style={styles.infoSection}>
								<Text style={styles.infoLabel}>Price Change Reason:</Text>
								<Text style={styles.infoValue}>
									{order.price_change_reason}
								</Text>
							</View>
						)}
					</>
				:	<View style={styles.infoSection}>
						<Text style={styles.infoLabel}>Total:</Text>
						<Text style={[styles.infoValue, styles.totalPrice]}>
							₱{Number(order.total_price).toFixed(2)}
						</Text>
					</View>
				}
			</View>

			{/* Payment Information */}
			<View style={styles.sectionCard}>
				<Text style={styles.sectionTitle}>
					<Ionicons
						name="card-outline"
						size={16}
						color="#A40C2D"
						style={styles.inlineIcon}
					/>{' '}
					Payment
				</Text>
				<View style={styles.infoSection}>
					<Text style={styles.infoLabel}>Payment Method:</Text>
					<View style={styles.paymentMethodDisplay}>
						{order.payment_method === 'gcash' ?
							<Text style={styles.infoValue}>GCash</Text>
						:	<Text style={styles.infoValue}>
								<Ionicons
									name="cash-outline"
									size={14}
									color="#666"
									style={styles.inlineIcon}
								/>{' '}
								On-Counter
							</Text>
						}
					</View>
				</View>
				{order.payment_method === 'gcash' && (
					<View style={styles.gcashSection}>
						{/* Receipt Timer - only show when accepted */}
						{order.order_status === 'accepted' &&
							order.accepted_at &&
							order.receipt_timer &&
							(() => {
								const { timeRemaining, isExpired } = calculateTimer()

								return timeRemaining ?
										<View
											style={[
												styles.timerCard,
												isExpired && styles.timerCardExpired,
											]}>
											<View style={styles.timerHeader}>
												<Ionicons
													name={isExpired ? 'alert-circle' : 'time'}
													size={20}
													color={isExpired ? '#dc3545' : '#28a745'}
												/>
												<Text
													style={[
														styles.timerTitle,
														isExpired && styles.timerTitleExpired,
													]}>
													{isExpired ?
														'Receipt Upload Expired'
													:	'Time Remaining for Receipt'}
												</Text>
											</View>
											<Text
												style={[
													styles.timerCountdown,
													isExpired && styles.timerCountdownExpired,
												]}>
												{timeRemaining}
											</Text>
											{!isExpired && (
												<Text style={styles.timerInstructions}>
													⏳ Customer must upload GCash receipt before timer
													expires
												</Text>
											)}
											{isExpired && (
												<Text style={styles.timerExpiredMessage}>
													⏰ Upload time has expired. Consider declining this
													order.
												</Text>
											)}
										</View>
									:	null
							})()}

						{/* Receipt Status Indicators */}
						{order.gcash_screenshot ?
							<View style={styles.paymentProofSection}>
								<View
									style={{
										flexDirection: 'row',
										justifyContent: 'space-between',
										alignItems: 'center',
										marginBottom: 8,
									}}>
									<Text style={styles.infoLabel}>GCash Screenshot:</Text>
									<View
										style={{
											backgroundColor: '#28a745',
											paddingHorizontal: 8,
											paddingVertical: 4,
											borderRadius: 4,
										}}>
										<Text
											style={{
												color: '#fff',
												fontSize: 12,
												fontWeight: '600',
											}}>
											Uploaded
										</Text>
									</View>
								</View>
								<TouchableOpacity
									onPress={() => setPreviewSource(order.gcash_screenshot)}>
									<Image
										source={{ uri: order.gcash_screenshot }}
										style={styles.paymentProof}
									/>
								</TouchableOpacity>

								{/* Reject Receipt Button */}
								{order.order_status === 'accepted' && (
									<TouchableOpacity
										style={[
											styles.rejectReceiptBtn,
											rejectingReceipt && styles.rejectReceiptBtnDisabled,
										]}
										onPress={rejectReceipt}
										disabled={rejectingReceipt}>
										<Ionicons
											name="close-circle-outline"
											size={16}
											color="#fff"
											style={{ marginRight: 6 }}
										/>
										<Text style={styles.rejectReceiptText}>
											{rejectingReceipt ?
												'Rejecting...'
											:	'Reject Receipt (Not Legitimate)'}
										</Text>
									</TouchableOpacity>
								)}
							</View>
						:	<View style={styles.noReceiptContainer}>
								<Ionicons
									name="alert-circle-outline"
									size={24}
									color="#ff9800"
								/>
								<Text style={styles.noReceiptText}>
									No GCash receipt uploaded yet
								</Text>
							</View>
						}
					</View>
				)}
			</View>
			{/* Decline Reason (if applicable) */}
			{order.order_status === 'declined' && order.decline_reason && (
				<View style={[styles.sectionCard, styles.declineCard]}>
					<Text style={styles.sectionTitle}>
						<Ionicons
							name="close-circle-outline"
							size={16}
							color="#dc3545"
							style={styles.inlineIcon}
						/>{' '}
						Decline Information
					</Text>
					<View style={styles.infoSection}>
						<Text style={styles.infoLabel}>Reason:</Text>
						<Text style={[styles.infoValue, styles.declineReason]}>
							{order.decline_reason}
						</Text>
					</View>
				</View>
			)}

			{/* Order Items */}
			<View style={styles.sectionCard}>
				<Text style={styles.sectionTitle}>
					<Ionicons
						name="cart-outline"
						size={16}
						color="#A40C2D"
						style={styles.inlineIcon}
					/>{' '}
					Order Items
				</Text>
				<FlatList
					data={order.items || []}
					keyExtractor={(item) => item.id.toString()}
					renderItem={({ item }) => (
						<View style={styles.itemCard}>
							<Text style={styles.itemName}>
								{Number(item.quantity ?? 1)} x {item.item_name}
							</Text>
							<Text style={styles.infoLabel}>Dining Option:</Text>
							<Text style={styles.infoValue}>
								<Ionicons
									name={
										item.dining_option === 'take-out' ?
											'cube-outline'
										:	'restaurant-outline'
									}
									size={14}
									color="#666"
									style={styles.inlineIcon}
								/>
								{item.dining_option === 'take-out' ? 'Take-out' : 'Dine-in'}
							</Text>
							<Text>₱{Number(item.total_price).toFixed(2)}</Text>
							{item.note && <Text style={styles.note}>Note: {item.note}</Text>}
							{item.variations?.length > 0 && (
								<View style={{ marginTop: 5 }}>
									{item.variations.map((v: any, vIndex: number) => (
										<Text
											key={`${item.id}-${v.id}-${vIndex}`}
											style={styles.variation}>
											• {v.variation_group_name}: {v.variation_name}
											{v.quantity > 1 ? ` x${v.quantity}` : ''} (+₱
											{Number(v.additional_price || 0).toFixed(2)})
											{v.quantity > 1 ?
												` = ₱${(
													Number(v.additional_price || 0) * (v.quantity || 1)
												).toFixed(2)}`
											:	''}
										</Text>
									))}
								</View>
							)}
						</View>
					)}
					scrollEnabled={false}
				/>
			</View>

			{renderStatusButtons()}

			<ImagePreviewModal
				visible={!!previewSource}
				imageUrl={previewSource}
				title="GCash screenshot"
				onClose={() => setPreviewSource(null)}
			/>

			{/* Accept Order Modal (optional price adjustment) */}
			<Modal
				visible={acceptModalVisible}
				animationType="slide"
				transparent={true}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContainer}>
						<Text style={styles.modalHeader}>Accept Order</Text>
						<Text style={styles.modalSubtitle}>
							You can optionally adjust the total before accepting.
						</Text>

						<View style={styles.infoSection}>
							<Text style={styles.infoLabel}>Original Total:</Text>
							<Text style={styles.infoValue}>
								₱{Number(order.total_price).toFixed(2)}
							</Text>
						</View>

						<View style={styles.infoSection}>
							<Text style={styles.infoLabel}>New Total (optional):</Text>
							<TextInput
								style={styles.customReasonInput}
								keyboardType="numeric"
								placeholder={Number(order.total_price).toFixed(2)}
								value={adjustedTotal}
								onChangeText={setAdjustedTotal}
							/>
						</View>

						<Text style={styles.reasonLabel}>
							Reason for change (optional):
						</Text>
						{[
							'Applied discount',
							'Correcting system total',
							'Removed unavailable items',
							'Other (specify below)',
						].map((reason, index) => (
							<TouchableOpacity
								key={index}
								style={[
									styles.reasonOption,
									(index === 3 ?
										priceReason === 'custom'
									:	priceReason === reason) && styles.selectedReason,
								]}
								onPress={() => {
									if (index === 3) {
										setPriceReason('custom')
									} else {
										setPriceReason(reason)
										setCustomPriceReason('')
									}
								}}>
								<Text
									style={[
										styles.reasonText,
										(index === 3 ?
											priceReason === 'custom'
										:	priceReason === reason) && styles.selectedReasonText,
									]}>
									{reason}
								</Text>
							</TouchableOpacity>
						))}

						{priceReason === 'custom' && (
							<View style={styles.customReasonContainer}>
								<Text style={styles.reasonLabel}>Custom reason:</Text>
								<TextInput
									style={[styles.customReasonInput]}
									placeholder="Enter your reason for changing the total..."
									value={customPriceReason}
									onChangeText={setCustomPriceReason}
									multiline
									numberOfLines={3}
								/>
							</View>
						)}

						<View style={styles.modalButtonRow}>
							<TouchableOpacity
								style={styles.cancelModalBtn}
								onPress={cancelAccept}
								disabled={updatingStatus}>
								<Text style={styles.cancelModalText}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.submitDeclineBtn}
								onPress={submitAccept}
								disabled={updatingStatus}>
								<Text style={styles.submitDeclineText}>
									{updatingStatus ? 'Saving...' : 'Accept Order'}
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Decline Reason Modal */}
			<Modal
				visible={declineModalVisible}
				animationType="slide"
				transparent={true}>
				<View style={styles.modalOverlay}>
					<ScrollView
						style={styles.modalContainer}
						contentContainerStyle={{ paddingBottom: 20 }}>
						<Text style={styles.modalHeader}>Decline Order</Text>
						<Text style={styles.modalSubtitle}>
							Please provide a reason for declining this order:
						</Text>

						{/* Preset Reasons */}
						<Text style={styles.reasonLabel}>Select a reason:</Text>
						{[
							'Item not available',
							'Unavailable options/variations',
							'Concession is closed or about to close',
							'Order too large to fulfill',
							'Other (specify below)',
						].map((reason, index) => (
							<TouchableOpacity
								key={index}
								style={[
									styles.reasonOption,
									selectedReason === (index === 4 ? 'custom' : reason) &&
										styles.selectedReason,
								]}
								onPress={() => {
									setSelectedReason(index === 4 ? 'custom' : reason)
									if (index !== 4) setCustomReason('')
								}}>
								<Text
									style={[
										styles.reasonText,
										selectedReason === (index === 4 ? 'custom' : reason) &&
											styles.selectedReasonText,
									]}>
									{reason}
								</Text>
							</TouchableOpacity>
						))}

						{/* Item Availability Toggles for "Item not available" */}
						{selectedReason === 'Item not available' && order?.items && (
							<View style={styles.itemToggleContainer}>
								<Text style={styles.reasonLabel}>
									Mark items as unavailable:
								</Text>
								<Text style={styles.itemToggleSubtext}>
									Selected items will be marked unavailable in your menu
								</Text>
								{/* Get unique items from order */}
								{Array.from(
									new Map(
										order.items.map((item: any) => [
											item.item_id,
											{ id: item.item_id, name: item.item_name },
										])
									).values()
								).map((item: any) => (
									<View
										key={item.id}
										style={styles.itemToggleRow}>
										<Checkbox
											value={itemsToToggle[item.id] || false}
											onValueChange={(value: boolean) => {
												setItemsToToggle((prev) => ({
													...prev,
													[item.id]: value,
												}))
											}}
											color={itemsToToggle[item.id] ? '#A40C2D' : undefined}
											style={styles.checkbox}
										/>
										<Text style={styles.itemToggleName}>{item.name}</Text>
									</View>
								))}
							</View>
						)}

						{/* Variation Availability Toggles for "Unavailable options/variations" */}
						{selectedReason === 'Unavailable options/variations' &&
							order?.items && (
								<View style={styles.itemToggleContainer}>
									<Text style={styles.reasonLabel}>
										Mark variations as unavailable:
									</Text>
									<Text style={styles.itemToggleSubtext}>
										Selected variations will be marked unavailable in your menu
									</Text>

									{(() => {
										// Group variations by item
										const itemsWithVariations: Array<{
											itemId: number
											itemName: string
											variations: Array<{
												variationId: number
												groupName: string
												variationName: string
											}>
										}> = []

										console.log('Order Items:', JSON.stringify(order.items))
										// Collect unique items with their variations
										const processedItems = new Set<number>()
										for (const orderItem of order.items) {
											if (
												!processedItems.has(orderItem.item_id) &&
												orderItem.variations &&
												orderItem.variations.length > 0
											) {
												processedItems.add(orderItem.item_id)
												const variations: Array<{
													variationId: number
													groupName: string
													variationName: string
												}> = []

												// Collect all unique variations for this item from all order items
												const seenVariations = new Set<number>()
												for (const oi of order.items) {
													if (oi.item_id === orderItem.item_id) {
														for (const v of oi.variations || []) {
															if (!seenVariations.has(v.id)) {
																seenVariations.add(v.id)
																variations.push({
																	variationId: v.id,
																	groupName: v.variation_group_name,
																	variationName: v.variation_name,
																})
															}
														}
													}
												}
												itemsWithVariations.push({
													itemId: orderItem.item_id,
													itemName: orderItem.item_name,
													variations,
												})
											}
										}

										if (itemsWithVariations.length === 0) {
											return (
												<Text
													style={[
														styles.itemToggleSubtext,
														{ fontStyle: 'italic', marginTop: 10 },
													]}>
													No variations in this order to toggle
												</Text>
											)
										}

										// Group variations by group name for each item
										return itemsWithVariations.map((item, itemIndex) => {
											const groupedVariations = new Map<
												string,
												Array<{ variationId: number; variationName: string }>
											>()

											for (const v of item.variations) {
												if (!groupedVariations.has(v.groupName)) {
													groupedVariations.set(v.groupName, [])
												}
												groupedVariations.get(v.groupName)!.push({
													variationId: v.variationId,
													variationName: v.variationName,
												})
											}
											console.log(
												'itemsWithVariations:',
												JSON.stringify(itemsWithVariations)
											)

											console.log(
												'Grouped Variations:',
												JSON.stringify(groupedVariations)
											)

											return (
												<View
													key={`${item.itemId}-${itemIndex}`}
													style={{
														marginTop: 15,
														paddingTop: 15,
														borderTopWidth: 1,
														borderTopColor: '#e0e0e0',
													}}>
													<Text
														style={{
															fontSize: 15,
															fontWeight: '600',
															color: '#A40C2D',
															marginBottom: 10,
														}}>
														{item.itemName}
													</Text>

													{Array.from(groupedVariations.entries()).map(
														([groupName, variations], groupIndex) => (
															<View
																key={`${item.itemId}-${groupName}-${groupIndex}`}
																style={{ marginBottom: 12 }}>
																<View
																	style={{
																		flexDirection: 'row',
																		alignItems: 'center',
																		marginBottom: 6,
																	}}>
																	<Checkbox
																		value={variations.every(
																			(v) => variationsToToggle[v.variationId]
																		)}
																		onValueChange={(value: boolean) => {
																			const newState = { ...variationsToToggle }
																			for (const v of variations) {
																				newState[v.variationId] = value
																			}
																			setVariationsToToggle(newState)
																		}}
																		color={
																			(
																				variations.every(
																					(v) =>
																						variationsToToggle[v.variationId]
																				)
																			) ?
																				'#A40C2D'
																			:	undefined
																		}
																		style={styles.checkbox}
																	/>
																	<Text
																		style={{
																			fontSize: 14,
																			fontWeight: '600',
																			color: '#555',
																			marginLeft: 10,
																			flex: 1,
																		}}>
																		{groupName} (Select All)
																	</Text>
																</View>

																{variations.map((v, vIndex) => (
																	<View
																		key={`${item.itemId}-${groupName}-${groupIndex}-${v.variationId}-${vIndex}`}
																		style={{
																			flexDirection: 'row',
																			alignItems: 'center',
																			paddingVertical: 8,
																			paddingLeft: 15,
																		}}>
																		<Checkbox
																			value={
																				variationsToToggle[v.variationId] ||
																				false
																			}
																			onValueChange={(value: boolean) => {
																				setVariationsToToggle((prev) => ({
																					...prev,
																					[v.variationId]: value,
																				}))
																			}}
																			color={
																				variationsToToggle[v.variationId] ?
																					'#A40C2D'
																				:	undefined
																			}
																			style={styles.checkbox}
																		/>
																		<Text
																			style={{
																				fontSize: 13,
																				color: '#333',
																				marginLeft: 10,
																				flex: 1,
																			}}>
																			{v.variationName}
																		</Text>
																	</View>
																))}
															</View>
														)
													)}
												</View>
											)
										})
									})()}
								</View>
							)}

						{/* Close Concession Button for "Concession is closed or about to close" */}
						{selectedReason === 'Concession is closed or about to close' && (
							<View style={styles.itemToggleContainer}>
								<Text style={styles.reasonLabel}>Close your concession:</Text>
								<Text style={styles.itemToggleSubtext}>
									This will close your concession and prevent new orders
								</Text>
								<TouchableOpacity
									style={[
										styles.submitDeclineBtn,
										{ marginTop: 10 },
										closingConcession && { opacity: 0.6 },
									]}
									onPress={async () => {
										try {
											setClosingConcession(true)
											await api.put(
												`/concession/${order.concession_id}/status`,
												{
													status: 'closed',
												}
											)
											showToast('success', 'Concession closed successfully')
										} catch (error) {
											console.error('Error closing concession:', error)
											showToast('error', 'Failed to close concession')
										} finally {
											setClosingConcession(false)
										}
									}}
									disabled={closingConcession}>
									<Text style={styles.submitDeclineText}>
										{closingConcession ? 'Closing...' : 'Close Concession Now'}
									</Text>
								</TouchableOpacity>
							</View>
						)}

						{/* Custom Reason Input */}
						{selectedReason === 'custom' && (
							<View style={styles.customReasonContainer}>
								<Text style={styles.reasonLabel}>Custom reason:</Text>
								<TextInput
									style={styles.customReasonInput}
									placeholder="Enter your reason for declining..."
									value={customReason}
									onChangeText={setCustomReason}
									multiline
									numberOfLines={3}
								/>
							</View>
						)}

						{/* Modal Buttons */}
						<View style={styles.modalButtonRow}>
							<TouchableOpacity
								style={styles.cancelModalBtn}
								onPress={cancelDecline}>
								<Text style={styles.cancelModalText}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.submitDeclineBtn}
								onPress={submitDecline}
								disabled={updatingStatus}>
								<Text style={styles.submitDeclineText}>
									{updatingStatus ? 'Declining...' : 'Decline Order'}
								</Text>
							</TouchableOpacity>
						</View>
					</ScrollView>
				</View>
			</Modal>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	contentContainer: { padding: 15, paddingBottom: 100 },
	customerSection: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f9f9f9',
		padding: 15,
		borderRadius: 10,
		marginBottom: 20,
	},
	customerAvatar: {
		width: 60,
		height: 60,
		borderRadius: 30,
	},
	customerAvatarPlaceholder: {
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: '#A40C2D',
		alignItems: 'center',
		justifyContent: 'center',
	},
	customerInitials: {
		color: '#fff',
		fontSize: 20,
		fontWeight: 'bold',
	},
	customerInfo: {
		flex: 1,
		marginLeft: 15,
	},
	customerName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 4,
	},
	customerEmail: {
		fontSize: 14,
		color: '#666',
	},
	inlineIcon: {
		marginRight: 6,
	},
	header: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 15,
		color: '#A40C2D',
	},
	infoSection: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	infoLabel: { fontSize: 14, fontWeight: '600', color: '#333', flex: 1 },
	infoValue: { fontSize: 14, color: '#666', flex: 1, textAlign: 'right' },
	status: { fontWeight: '600', color: '#A40C2D' },
	statusText: { textTransform: 'capitalize' },
	scheduleTime: { color: '#28a745', fontWeight: '500' },
	sectionHeader: {
		fontSize: 16,
		fontWeight: '600',
		marginTop: 15,
		marginBottom: 10,
	},
	itemCard: {
		backgroundColor: '#f9f9f9',
		padding: 10,
		borderRadius: 8,
		marginBottom: 8,
	},
	itemName: { fontWeight: '600' },
	variation: { fontSize: 13, color: '#444' },
	paymentProof: { marginTop: 5, width: '100%', height: 200, borderRadius: 10 },
	emptyText: { textAlign: 'center', color: '#888', marginTop: 20 },
	note: { fontSize: 13, color: '#555', fontStyle: 'italic', marginTop: 2 },
	buttonRow: { flexDirection: 'row', marginTop: 15 },
	acceptBtn: {
		flex: 1,
		backgroundColor: 'green',
		padding: 10,
		borderRadius: 8,
		marginRight: 5,
		alignItems: 'center',
	},
	declineBtn: {
		flex: 1,
		backgroundColor: 'red',
		padding: 10,
		borderRadius: 8,
		marginLeft: 5,
		alignItems: 'center',
	},
	readyBtn: {
		flex: 1,
		backgroundColor: 'orange',
		padding: 10,
		borderRadius: 8,
		marginTop: 10,
		alignItems: 'center',
	},
	completeBtn: {
		flex: 1,
		backgroundColor: '#A40C2D',
		padding: 10,
		borderRadius: 8,
		marginTop: 10,
		alignItems: 'center',
	},
	btnText: { color: '#fff', fontWeight: '600' },
	declineReason: { color: '#dc3545', fontStyle: 'italic' },
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
	reasonLabel: {
		fontSize: 16,
		fontWeight: '600',
		marginTop: 15,
		marginBottom: 10,
		color: '#333',
	},
	reasonOption: {
		padding: 12,
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		marginBottom: 8,
		backgroundColor: '#f9f9f9',
	},
	selectedReason: {
		backgroundColor: '#A40C2D',
		borderColor: '#A40C2D',
	},
	reasonText: {
		fontSize: 14,
		color: '#333',
	},
	selectedReasonText: {
		color: '#fff',
		fontWeight: '600',
	},
	itemToggleContainer: {
		marginTop: 15,
		backgroundColor: '#f8f9fa',
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e0e0e0',
	},
	itemToggleSubtext: {
		fontSize: 12,
		color: '#666',
		marginBottom: 12,
	},
	itemToggleRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#e8e8e8',
	},
	itemToggleName: {
		fontSize: 14,
		fontWeight: '500',
		color: '#333',
		flex: 1,
	},
	toggleButton: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 6,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#ddd',
	},
	toggleButtonActive: {
		backgroundColor: '#dc3545',
		borderColor: '#dc3545',
	},
	toggleButtonText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#333',
	},
	toggleButtonTextActive: {
		color: '#fff',
	},
	checkbox: {
		marginRight: 10,
	},
	customReasonContainer: {
		marginTop: 10,
	},
	customReasonInput: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 12,
		fontSize: 14,
		backgroundColor: '#fff',
		textAlignVertical: 'top',
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
	submitDeclineBtn: {
		flex: 1,
		backgroundColor: '#dc3545',
		padding: 12,
		borderRadius: 8,
		alignItems: 'center',
	},
	submitDeclineText: {
		color: '#fff',
		fontWeight: '600',
	},
	sectionCard: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginVertical: 8,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 3.84,
		elevation: 5,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#A40C2D',
		marginBottom: 12,
	},
	fullImageContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 10,
	},
	fullPaymentProof: {
		width: '100%',
		height: '80%',
		borderRadius: 10,
		backgroundColor: '#000',
	},
	updatedPrice: {
		fontWeight: '600',
		color: '#28a745',
	},
	totalPrice: {
		fontWeight: '600',
		color: '#A40C2D',
	},
	paymentProofSection: {
		marginTop: 12,
	},
	declineCard: {
		borderLeftWidth: 4,
		borderLeftColor: '#dc3545',
		backgroundColor: '#fff5f5',
	},
	gcashSection: {
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
	},
	paymentMethodDisplay: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		justifyContent: 'flex-end',
	},
	timerCard: {
		backgroundColor: '#e8f5e9',
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		borderWidth: 2,
		borderColor: '#28a745',
	},
	timerCardExpired: {
		backgroundColor: '#ffebee',
		borderColor: '#dc3545',
	},
	timerHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		gap: 8,
	},
	timerTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#28a745',
	},
	timerTitleExpired: {
		color: '#dc3545',
	},
	timerCountdown: {
		fontSize: 28,
		fontWeight: '900',
		color: '#28a745',
		textAlign: 'center',
		marginVertical: 8,
	},
	timerCountdownExpired: {
		color: '#dc3545',
	},
	timerInstructions: {
		fontSize: 11,
		color: '#666',
		textAlign: 'center',
		marginTop: 4,
	},
	timerExpiredMessage: {
		fontSize: 11,
		color: '#dc3545',
		textAlign: 'center',
		marginTop: 4,
		fontWeight: '600',
	},
	rejectReceiptBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#dc3545',
		padding: 12,
		borderRadius: 8,
		marginTop: 12,
	},
	rejectReceiptBtnDisabled: {
		opacity: 0.6,
	},
	rejectReceiptText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '600',
	},
	noReceiptContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff8e1',
		padding: 16,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#ff9800',
		gap: 10,
	},
	noReceiptText: {
		fontSize: 14,
		color: '#ff9800',
		fontWeight: '600',
	},
})

export default ViewOrderConcessionaire
