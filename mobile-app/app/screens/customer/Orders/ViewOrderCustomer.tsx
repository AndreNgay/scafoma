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
	Platform,
	BackHandler,
	Modal,
	RefreshControl,
	Clipboard,
} from 'react-native'
import {
	useRoute,
	useNavigation,
	useFocusEffect,
} from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import api from '../../../libs/apiCall'
import { useToast } from '../../../contexts/ToastContext'
import ImagePreviewModal from '../../../components/ImagePreviewModal'

// Import icons
const GCashIcon = require('../../../../assets/images/gcash-icon.png')

const ViewOrderCustomer = () => {
	const route = useRoute<any>()
	const navigation = useNavigation<any>()
	const { orderId } = route.params

	const [order, setOrder] = useState<any>(null)
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [uploading, setUploading] = useState(false)
	const [cancelling, setCancelling] = useState(false)
	const [updatingPayment, setUpdatingPayment] = useState(false)
	const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false)
	const [previewSource, setPreviewSource] = useState<string | null>(null)
	const [currentTime, setCurrentTime] = useState(Date.now())
	const { showToast } = useToast()

	const copyGcashNumber = async () => {
		if (!order?.gcash_number) return
		try {
			Clipboard.setString(String(order.gcash_number))
			showToast('success', 'GCash number copied')
		} catch (err) {
			console.error('Error copying GCash number:', err)
			showToast('error', 'Failed to copy GCash number')
		}
	}

	const formatManila = (value: any) => {
		if (!value) return ''
		try {
			let dateObj: Date

			if (typeof value === 'string') {
				let s = value.trim()

				if (/[zZ]|[+-]\d{2}:?\d{2}/.test(s)) {
					dateObj = new Date(s)
				} else {
					// Handle plain "YYYY-MM-DD HH:MM:SS[.ffffff]" from backend.
					// Treat as UTC then render in Asia/Manila so DB times like
					// "2025-11-29 07:21:35.822299" become Manila local time.
					s = s.replace(' ', 'T')
					if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
						s += 'Z'
					}
					dateObj = new Date(s)
				}
			} else {
				dateObj = new Date(value)
			}

			if (Number.isNaN(dateObj.getTime())) return String(value)

			return new Intl.DateTimeFormat('en-PH', {
				timeZone: 'Asia/Manila',
				year: 'numeric',
				month: 'short',
				day: '2-digit',
				hour: 'numeric',
				minute: '2-digit',
			}).format(dateObj)
		} catch {
			return String(value)
		}
	}

	const formatSchedule = (value: any) => formatManila(value)
	const formatDateTime = (value: any) => formatManila(value)

	// Calculate receipt timer
	const calculateTimer = () => {
		if (
			!order ||
			order.payment_method !== 'gcash' ||
			order.order_status !== 'accepted'
		) {
			return { timeRemaining: null, isExpired: false }
		}

		try {
			// Prefer explicit expiry timestamp from backend, fall back to accepted_at + receipt_timer
			let deadlineMs: number | null = null
			if (order.payment_receipt_expires_at) {
				const expiresDate = new Date(order.payment_receipt_expires_at)
				if (!Number.isNaN(expiresDate.getTime())) {
					deadlineMs = expiresDate.getTime()
				}
			}

			if (deadlineMs === null) {
				if (!order.accepted_at || !order.receipt_timer) {
					return { timeRemaining: null, isExpired: false }
				}

				const acceptedDate = new Date(order.accepted_at)
				const [hours, minutes, seconds] = order.receipt_timer
					.split(':')
					.map(Number)
				deadlineMs =
					acceptedDate.getTime() +
					(hours * 3600 + minutes * 60 + seconds) * 1000
			}

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
				!order.payment_proof
			) {
				const { isExpired } = calculateTimer()
				if (isExpired) {
					try {
						await api.post(`/order/${order.id}/check-expired`)
						await fetchOrder()
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
	}, [currentTime, order?.id, order?.order_status, order?.payment_proof])

	// ===============================
	// Fetch order by ID
	// ===============================
	const fetchOrder = async (isRefresh = false) => {
		try {
			if (isRefresh) {
				setRefreshing(true)
			} else {
				setLoading(true)
			}
			const res = await api.get(`/order/${orderId}`)
			const data = res.data

			// Normalize payment proof URL for frontend
			data.payment_proof = data.payment_proof || data.gcash_screenshot || null

			setOrder(data)
		} catch (err) {
			console.error(err)
			showToast('error', 'Failed to fetch order')
		} finally {
			if (isRefresh) {
				setRefreshing(false)
			} else {
				setLoading(false)
			}
		}
	}

	useEffect(() => {
		fetchOrder()
	}, [orderId])

	// Update current time every second for timer
	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(Date.now())
		}, 1000)
		return () => clearInterval(interval)
	}, [])

	useFocusEffect(
		React.useCallback(() => {
			const onBackPress = () => {
				if (navigation.canGoBack()) {
					navigation.goBack()
					return true
				}
				navigation.navigate('Orders', { screen: 'Customer Orders' })
				return true
			}
			const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress)
			return () => sub.remove()
		}, [navigation])
	)

	// ===============================
	// Cancel order
	// ===============================
	const cancelOrder = () => {
		setCancelConfirmVisible(true)
	}

	const confirmCancelOrder = async () => {
		try {
			setCancelling(true)
			await api.put(`/order/cancel/${orderId}`)
			showToast('success', 'Order cancelled successfully')
			await fetchOrder()
		} catch (error: any) {
			console.error('Error cancelling order:', error)
			const message =
				error.response?.data?.error ||
				'Failed to cancel order. Please try again.'
			showToast('error', message)
		} finally {
			setCancelling(false)
			setCancelConfirmVisible(false)
		}
	}

	// ===============================
	// Pick and upload GCash screenshot
	// ===============================
	const pickImage = async () => {
		if (!order) return

		try {
			const permissionResult =
				await ImagePicker.requestMediaLibraryPermissionsAsync()
			if (!permissionResult.granted) {
				showToast('error', 'Please allow access to your photos.')
				return
			}

			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: false,
				quality: 0.8,
			})

			if (result.canceled) return
			const asset = result.assets[0]
			if (!asset?.uri) return

			await uploadPaymentProof(asset.uri)
		} catch (err) {
			console.error(err)
			showToast('error', 'Failed to pick image')
		}
	}

	const uploadPaymentProof = async (uri: string) => {
		if (!order) return

		// Check if timer has expired before uploading
		const { isExpired } = calculateTimer()
		if (isExpired) {
			showToast('error', 'Receipt upload time has expired. This order will be automatically declined.')
			return
		}

		const formData = new FormData()
		formData.append('gcash_screenshot', {
			uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
			name: `gcash_${order.id}.jpg`,
			type: 'image/jpeg',
		} as any)

		try {
			setUploading(true)
			const res = await api.put(
				`/order/gcash-screenshot/${order.id}`,
				formData,
				{
					headers: { 'Content-Type': 'multipart/form-data' },
				}
			)

			setOrder((prev: any) => ({
				...prev,
				payment_proof: res.data.payment_proof || res.data.gcash_screenshot,
			}))
			showToast('success', 'GCash screenshot uploaded!')
		} catch (err: any) {
			console.error(err)
			const errorMessage =
				err.response?.data?.error || 'Failed to upload screenshot'
			showToast('error', errorMessage)
		} finally {
			setUploading(false)
		}
	}

	// ===============================
	// Change payment method
	// ===============================
	const changePaymentMethod = async (method: 'gcash' | 'on-counter') => {
		if (!order) return
		if (order.payment_method === method) return
		// Only allow change when order is pending
		if (order.order_status !== 'pending') {
			showToast(
				'error',
				'Payment method can only be changed while the order is pending.'
			)
			return
		}
		// Guard against unavailable methods
		if (method === 'gcash' && !order.gcash_payment_available) return
		if (method === 'on-counter' && !order.oncounter_payment_available) return

		try {
			setUpdatingPayment(true)
			await api.patch(`/order/${order.id}/payment-method`, {
				payment_method: method,
			})
			await fetchOrder()
		} catch (err: any) {
			console.error('Error updating payment method:', err)
			showToast(
				'error',
				err.response?.data?.error || 'Failed to update payment method'
			)
		} finally {
			setUpdatingPayment(false)
		}
	}

	// ===============================
	// Render
	// ===============================
	const onRefresh = () => {
		if (loading) return
		fetchOrder(true)
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

	return (
		<ScrollView
			style={styles.container}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={onRefresh}
					tintColor="#A40C2D"
				/>
			}>
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
					Order Status
				</Text>
				<View style={styles.statusRow}>
					<Text style={styles.statusLabel}>Status:</Text>
					<Text style={[styles.status, styles.statusBadge]}>
						{order.order_status}
					</Text>
				</View>
				<View style={styles.infoRow}>
					<Text style={styles.infoLabel}>Order Date:</Text>
					<Text style={styles.infoValue}>
						{formatDateTime(order.created_at)}
					</Text>
				</View>
				{order.schedule_time && (
					<Text style={styles.scheduleTime}>
						<Ionicons
							name="time-outline"
							size={14}
							color="#28a745"
							style={styles.inlineIcon}
						/>{' '}
						Scheduled for: {formatSchedule(order.schedule_time)}
					</Text>
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
						Order Declined
					</Text>
					<View style={styles.infoRow}>
						<Text style={styles.infoLabel}>Reason:</Text>
						<Text style={[styles.infoValue, styles.declineReason]}>
							{order.decline_reason}
						</Text>
					</View>
				</View>
			)}

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
				<View style={styles.paymentMethodButtons}>
					{/* GCash option */}
					<TouchableOpacity
						style={[
							styles.paymentMethodButton,
							order.payment_method === 'gcash' && styles.paymentMethodSelected,
							!order.gcash_payment_available && styles.paymentMethodDisabled,
						]}
						disabled={!order.gcash_payment_available || updatingPayment}
						onPress={() => changePaymentMethod('gcash')}>
						<View style={styles.paymentMethodContent}>
							<Image
								source={GCashIcon}
								style={styles.gcashIconSmall}
							/>
							<Text
								style={[
									styles.paymentMethodText,
									order.payment_method === 'gcash' &&
										styles.paymentMethodTextSelected,
									!order.gcash_payment_available &&
										styles.paymentMethodTextDisabled,
								]}>
								GCash {!order.gcash_payment_available ? '(Unavailable)' : ''}
							</Text>
						</View>
					</TouchableOpacity>

					{/* On-Counter option */}
					<TouchableOpacity
						style={[
							styles.paymentMethodButton,
							order.payment_method === 'on-counter' &&
								styles.paymentMethodSelected,
							!order.oncounter_payment_available &&
								styles.paymentMethodDisabled,
						]}
						disabled={!order.oncounter_payment_available || updatingPayment}
						onPress={() => changePaymentMethod('on-counter')}>
						<Text
							style={[
								styles.paymentMethodText,
								order.payment_method === 'on-counter' &&
									styles.paymentMethodTextSelected,
								!order.oncounter_payment_available &&
									styles.paymentMethodTextDisabled,
							]}>
							<Ionicons
								name="cash-outline"
								size={14}
								color={
									order.payment_method === 'on-counter' ? '#A40C2D' : '#666'
								}
								style={styles.inlineIcon}
							/>
							On-Counter{' '}
							{!order.oncounter_payment_available ? '(Unavailable)' : ''}
						</Text>
					</TouchableOpacity>
				</View>

				{/* GCash Payment Details */}
				{order.payment_method === 'gcash' && (
					<View style={styles.gcashDetailsCard}>
						<View style={styles.gcashDetailsHeader}>
							<Image
								source={GCashIcon}
								style={styles.gcashIcon}
							/>
							<Text style={styles.gcashSectionTitle}>
								GCash Payment Details
							</Text>
						</View>
						{order.gcash_number && (
							<View style={styles.gcashNumberRow}>
								<Text style={styles.paymentLabel}>
									GCash Number: {order.gcash_number}
								</Text>
								<TouchableOpacity
									style={styles.copyButton}
									onPress={copyGcashNumber}>
									<Ionicons
										name="copy-outline"
										size={16}
										color="#fff"
										style={{ marginRight: 4 }}
									/>
									<Text style={styles.copyButtonText}>Copy</Text>
								</TouchableOpacity>
							</View>
						)}

						{/* Receipt Timer - only show when accepted */}
						{order.order_status === 'accepted' &&
							order.accepted_at &&
							order.receipt_timer &&
							(() => {
								const { timeRemaining, isExpired } = calculateTimer()

								return (
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
												:	'Time Remaining'}
											</Text>
										</View>
										<Text
											style={[
												styles.timerCountdown,
												isExpired && styles.timerCountdownExpired,
											]}>
											{timeRemaining || '--:--'}
										</Text>
										{!isExpired && (
											<Text style={styles.timerInstructions}>
												⚠️ Please upload your GCash payment receipt before time
												expires
											</Text>
										)}
										{isExpired && (
											<Text style={styles.timerExpiredMessage}>
												⏰ Time expired! Your order will be automatically
												declined if receipt is not uploaded.
											</Text>
										)}
										<TouchableOpacity
											style={styles.contactButton}
											onPress={() => {
												// Navigate to concessionaire profile
												if (order.concessionaire_id) {
													navigation.navigate('ViewConcessionaireProfile', {
														concessionaireId: order.concessionaire_id,
													})
												}
											}}>
											<Ionicons
												name="chatbubble-outline"
												size={16}
												color="#A40C2D"
											/>
											<Text style={styles.contactButtonText}>
												Contact Concessionaire
											</Text>
										</TouchableOpacity>
										{order.payment_receipt_expires_at && (
											<Text style={styles.paymentExpiryText}>
												Payment expires at:{' '}
												{formatDateTime(order.payment_receipt_expires_at)}
											</Text>
										)}
									</View>
								)
							})()}
						{(order.order_status === 'accepted' ||
							order.order_status === 'ready for pickup') &&
							(() => {
								let isTimerExpired = false
								try {
									let deadlineMs: number | null = null
									if (order.payment_receipt_expires_at) {
										const expiresDate = new Date(order.payment_receipt_expires_at)
										if (!Number.isNaN(expiresDate.getTime())) {
											deadlineMs = expiresDate.getTime()
										}
									}

									if (deadlineMs === null && order.accepted_at && order.receipt_timer) {
										const acceptedDate = new Date(order.accepted_at)
										const [hours, minutes, seconds] = order.receipt_timer
											.split(':')
											.map(Number)
										deadlineMs =
											acceptedDate.getTime() +
											(hours * 3600 + minutes * 60 + seconds) * 1000
									}

									if (deadlineMs !== null) {
										isTimerExpired = Date.now() > deadlineMs
									}
								} catch (e) {
									console.error('Error checking timer:', e)
								}

								return (
									<TouchableOpacity
										style={[
											styles.uploadBtn,
											(uploading || isTimerExpired) && styles.uploadBtnDisabled,
										]}
										onPress={pickImage}
										disabled={uploading || isTimerExpired}>
										<Text
											style={
												(uploading || isTimerExpired) &&
												styles.uploadBtnTextDisabled
											}>
											{uploading ?
												'Uploading...'
											: isTimerExpired ?
												'Upload Time Expired'
											: order.payment_proof ?
												'Replace Screenshot'
											:	'Upload Screenshot'}
										</Text>
									</TouchableOpacity>
								)
							})()}
					</View>
				)}
			</View>

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
								{item.item_name} x{item.quantity}
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
							{item.note && <Text>Note: {item.note}</Text>}
							{item.variations?.length > 0 && (
								<View style={{ marginTop: 5 }}>
									{item.variations.map((v: any) => (
										<Text
											key={v.id}
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
						<View style={styles.infoRow}>
							<Text style={styles.infoLabel}>Original Total:</Text>
							<Text style={styles.infoValue}>
								₱{Number(order.total_price).toFixed(2)}
							</Text>
						</View>
						<View style={styles.infoRow}>
							<Text style={styles.infoLabel}>Updated Total:</Text>
							<Text style={[styles.infoValue, styles.updatedPrice]}>
								₱{Number(order.updated_total_price).toFixed(2)}
							</Text>
						</View>
						{order.price_change_reason && (
							<View style={styles.infoRow}>
								<Text style={styles.infoLabel}>Reason for change:</Text>
								<Text style={styles.infoValue}>
									{order.price_change_reason}
								</Text>
							</View>
						)}
					</>
				:	<View style={styles.infoRow}>
						<Text style={styles.infoLabel}>Total:</Text>
						<Text style={[styles.infoValue, styles.totalPrice]}>
							₱{Number(order.total_price).toFixed(2)}
						</Text>
					</View>
				}
				{order.note && (
					<View style={styles.noteSection}>
						<Text style={styles.infoLabel}>Note:</Text>
						<Text style={styles.noteText}>{order.note}</Text>
					</View>
				)}
			</View>

			{/* Location & Concessionaire Info */}
			<View style={styles.sectionCard}>
				<Text style={styles.sectionTitle}>
					<Ionicons
						name="location-outline"
						size={16}
						color="#A40C2D"
						style={styles.inlineIcon}
					/>{' '}
					Location & Vendor
				</Text>
				<View style={styles.locationInfo}>
					<Text style={styles.locationText}>
						{order.cafeteria_name}
						{order.cafeteria_location && ` • ${order.cafeteria_location}`}
					</Text>
					<Text style={styles.concessionText}>
						Concession: {order.concession_name}
					</Text>
				</View>

				<TouchableOpacity
					style={styles.concessionaireCard}
					onPress={() =>
						navigation.navigate('View Concessionaire Profile', {
							concessionaireId: order.concessionaire_id || order.concession_id,
							concessionaireData: {
								first_name: order.concessionaire_first_name,
								last_name: order.concessionaire_last_name,
								email: order.concessionaire_email,
								contact_number: order.concessionaire_contact_number,
								messenger_link: order.concessionaire_messenger_link,
								profile_image_url: order.concessionaire_profile_image_url,
								concession_name: order.concession_name,
								cafeteria_name: order.cafeteria_name,
							},
						})
					}>
					{order.concessionaire_profile_image_url ?
						<Image
							source={{ uri: order.concessionaire_profile_image_url }}
							style={styles.concessionaireAvatar}
						/>
					:	<View style={styles.concessionaireAvatarPlaceholder}>
							<Text style={styles.concessionaireAvatarInitials}>
								{order.concessionaire_first_name?.[0] || ''}
								{order.concessionaire_last_name?.[0] || ''}
							</Text>
						</View>
					}
					<View style={{ flex: 1 }}>
						<Text style={styles.concessionaireLabel}>Concessionaire</Text>
						<Text style={styles.concessionaireName}>
							{order.concessionaire_first_name} {order.concessionaire_last_name}
						</Text>
					</View>
				</TouchableOpacity>
			</View>

			{/* Cancel Order Button - Only show for pending orders */}
			{order.order_status === 'pending' && (
				<View style={styles.cancelButtonContainer}>
					<TouchableOpacity
						style={[
							styles.cancelButton,
							cancelling && styles.cancelButtonDisabled,
						]}
						onPress={cancelOrder}
						disabled={cancelling}>
						{cancelling ?
							<ActivityIndicator
								color="#fff"
								size="small"
							/>
						:	<Text style={styles.cancelButtonText}>Cancel Order</Text>}
					</TouchableOpacity>
				</View>
			)}

			<ImagePreviewModal
				visible={!!previewSource}
				imageUrl={previewSource}
				title="Payment screenshot"
				onClose={() => setPreviewSource(null)}
			/>

			<Modal
				transparent
				visible={cancelConfirmVisible}
				animationType="fade"
				onRequestClose={() => setCancelConfirmVisible(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalBox}>
						<Text style={styles.modalTitle}>Cancel Order</Text>
						<Text style={styles.modalMessage}>
							Are you sure you want to cancel this order? This action cannot be
							undone.
						</Text>
						<View style={styles.modalButtonsRow}>
							<TouchableOpacity
								style={[styles.modalButton, styles.modalCancelButton]}
								onPress={() => setCancelConfirmVisible(false)}
								disabled={cancelling}>
								<Text style={styles.modalCancelText}>No</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.modalButton, styles.modalConfirmButton]}
								onPress={confirmCancelOrder}
								disabled={cancelling}>
								<Text style={styles.modalConfirmText}>
									{cancelling ? 'Cancelling...' : 'Yes, Cancel'}
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 15, backgroundColor: '#fff' },
	header: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 10,
		color: '#A40C2D',
	},
	status: { fontWeight: '600', color: '#A40C2D' },
	inlineIcon: {
		marginRight: 6,
	},
	sectionHeader: {
		fontSize: 18,
		fontWeight: '600',
		marginTop: 20,
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
	paymentProof: { marginTop: 15, width: '100%', height: 200, borderRadius: 10 },
	emptyText: { textAlign: 'center', color: '#888', marginTop: 20 },
	uploadBtn: {
		backgroundColor: '#f9f9f9',
		padding: 15,
		borderRadius: 10,
		alignItems: 'center',
		marginTop: 10,
	},
	paymentLabel: { fontWeight: '600', color: '#A40C2D', marginBottom: 5 },
	paymentMethodButtons: { flexDirection: 'row', gap: 10 },
	paymentMethodButton: {
		flex: 1,
		padding: 12,
		borderRadius: 8,
		borderWidth: 2,
		borderColor: '#ddd',
		backgroundColor: '#f9f9f9',
		alignItems: 'center',
	},
	paymentMethodSelected: {
		borderColor: '#A40C2D',
		backgroundColor: '#A40C2D22',
	},
	paymentMethodDisabled: {
		opacity: 0.5,
	},
	paymentMethodText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#666',
	},
	paymentMethodTextSelected: {
		color: '#A40C2D',
		fontWeight: '600',
	},
	paymentMethodTextDisabled: {
		color: '#999',
	},
	uploadDisabledContainer: {
		backgroundColor: '#f0f0f0',
		padding: 15,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#ddd',
		marginTop: 10,
	},
	uploadDisabledText: {
		fontSize: 14,
		color: '#666',
		textAlign: 'center',
		lineHeight: 20,
	},
	uploadedIndicator: {
		fontSize: 12,
		color: '#28a745',
		textAlign: 'center',
		marginTop: 8,
		fontWeight: '500',
	},
	scheduleTime: {
		fontSize: 14,
		color: '#28a745',
		fontWeight: '500',
		marginTop: 5,
		backgroundColor: '#e8f5e8',
		padding: 8,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#28a745',
	},
	declineReasonContainer: {
		backgroundColor: '#ffe6e6',
		padding: 10,
		borderRadius: 8,
		marginTop: 10,
		borderLeftWidth: 4,
		borderLeftColor: '#dc3545',
	},
	declineReasonLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#dc3545',
		marginBottom: 5,
	},
	declineReasonText: {
		fontSize: 13,
		color: '#666',
		fontStyle: 'italic',
	},
	cancelButtonContainer: {
		marginTop: 20,
		marginBottom: 20,
	},
	cancelButton: {
		backgroundColor: '#d32f2f',
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cancelButtonDisabled: {
		backgroundColor: '#ccc',
	},
	cancelButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	toastContainer: {
		marginTop: 12,
		padding: 10,
		borderRadius: 8,
		alignItems: 'center',
	},
	toastSuccess: {
		backgroundColor: '#4caf50',
	},
	toastError: {
		backgroundColor: '#f44336',
	},
	toastInfo: {
		backgroundColor: '#333',
	},
	toastText: {
		color: '#fff',
		fontSize: 13,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalBox: {
		width: '85%',
		backgroundColor: '#fff',
		borderRadius: 10,
		padding: 20,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 8,
	},
	modalMessage: {
		fontSize: 14,
		color: '#555',
		marginBottom: 16,
	},
	modalButtonsRow: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 10,
	},
	modalButton: {
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 6,
	},
	modalCancelButton: {
		backgroundColor: '#eee',
	},
	modalConfirmButton: {
		backgroundColor: '#d32f2f',
	},
	modalCancelText: {
		color: '#333',
		fontWeight: '500',
	},
	modalConfirmText: {
		color: '#fff',
		fontWeight: '600',
	},
	concessionCard: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
		marginTop: 10,
		marginBottom: 5,
		backgroundColor: '#f9f9f9',
		borderRadius: 8,
	},
	concessionAvatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		marginRight: 10,
	},
	concessionAvatarPlaceholder: {
		width: 48,
		height: 48,
		borderRadius: 24,
		marginRight: 10,
		backgroundColor: '#e5e7eb',
		alignItems: 'center',
		justifyContent: 'center',
	},
	concessionAvatarInitials: {
		fontSize: 18,
		fontWeight: '600',
		color: '#374151',
	},
	concessionName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#111827',
	},
	concessionSub: {
		fontSize: 13,
		color: '#6b7280',
	},
	gcashNumberRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 4,
	},
	copyButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 6,
		backgroundColor: '#A40C2D',
	},
	copyButtonText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 12,
	},
	locationCard: {
		backgroundColor: '#f8f9fa',
		padding: 12,
		marginTop: 10,
		marginBottom: 5,
		borderRadius: 8,
		borderLeftWidth: 4,
		borderLeftColor: '#28a745',
	},
	locationLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#28a745',
		marginBottom: 4,
	},
	locationText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#111827',
		marginBottom: 2,
	},
	concessionText: {
		fontSize: 14,
		color: '#6b7280',
	},
	concessionaireCard: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		marginTop: 5,
		marginBottom: 5,
		backgroundColor: '#fff',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	concessionaireAvatar: {
		width: 50,
		height: 50,
		borderRadius: 25,
		marginRight: 12,
	},
	concessionaireAvatarPlaceholder: {
		width: 50,
		height: 50,
		borderRadius: 25,
		marginRight: 12,
		backgroundColor: '#A40C2D',
		alignItems: 'center',
		justifyContent: 'center',
	},
	concessionaireAvatarInitials: {
		fontSize: 16,
		fontWeight: '600',
		color: '#fff',
	},
	concessionaireLabel: {
		fontSize: 12,
		color: '#6b7280',
		marginBottom: 2,
	},
	concessionaireName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#A40C2D',
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
	statusRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	statusLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#333',
	},
	statusBadge: {
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 12,
		backgroundColor: '#A40C2D22',
		color: '#A40C2D',
		fontWeight: '600',
		fontSize: 12,
		textTransform: 'uppercase',
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	infoLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#333',
		flex: 1,
	},
	infoValue: {
		fontSize: 14,
		color: '#666',
		textAlign: 'right',
		flex: 1,
	},
	locationInfo: {
		marginBottom: 12,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	updatedPrice: {
		fontWeight: '600',
		color: '#28a745',
	},
	totalPrice: {
		fontWeight: '600',
		color: '#A40C2D',
		fontSize: 16,
	},
	noteSection: {
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
	},
	noteText: {
		fontSize: 14,
		color: '#666',
		fontStyle: 'italic',
		marginTop: 4,
	},
	declineCard: {
		borderLeftWidth: 4,
		borderLeftColor: '#dc3545',
		backgroundColor: '#fff5f5',
	},
	declineReason: {
		color: '#dc3545',
		fontWeight: '500',
	},
	gcashSection: {
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
	},
	gcashSectionTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#A40C2D',
		marginBottom: 8,
	},
	onCounterSection: {
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
		textAlign: 'center',
	},
	paymentMethodContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	gcashIconSmall: {
		width: 16,
		height: 16,
		marginRight: 6,
	},
	gcashDetailsCard: {
		backgroundColor: '#f8f9fa',
		borderRadius: 8,
		padding: 12,
		marginTop: 12,
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	gcashDetailsHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	gcashIcon: {
		width: 20,
		height: 20,
		marginRight: 8,
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
		fontSize: 16,
		fontWeight: '700',
		color: '#28a745',
	},
	timerTitleExpired: {
		color: '#dc3545',
	},
	timerCountdown: {
		fontSize: 32,
		fontWeight: '900',
		color: '#28a745',
		textAlign: 'center',
		marginVertical: 8,
	},
	timerCountdownExpired: {
		color: '#dc3545',
	},
	timerInstructions: {
		fontSize: 12,
		color: '#666',
		textAlign: 'center',
		marginBottom: 8,
	},
	timerExpiredMessage: {
		fontSize: 12,
		color: '#dc3545',
		textAlign: 'center',
		marginBottom: 8,
		fontWeight: '600',
	},
	contactButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#A40C2D',
		gap: 6,
		marginTop: 4,
	},
	contactButtonText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#A40C2D',
	},
	uploadBtnDisabled: {
		backgroundColor: '#ccc',
		opacity: 0.6,
	},
	uploadBtnTextDisabled: {
		color: '#666',
	},
	paymentExpiryText: {
		marginTop: 8,
		fontSize: 12,
		color: '#555',
		textAlign: 'center',
	},
})

export default ViewOrderCustomer
