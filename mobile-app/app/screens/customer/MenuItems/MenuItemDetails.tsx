import React, { useEffect, useState } from 'react'
import {
	View,
	Text,
	Image,
	ScrollView,
	TouchableOpacity,
	Alert,
	StyleSheet,
	TextInput,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	RefreshControl,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import useStore from '../../../store'
import api from '../../../libs/apiCall'
import { useToast } from '../../../contexts/ToastContext'
import { Ionicons } from '@expo/vector-icons'
import ImagePreviewModal from '../../../components/ImagePreviewModal'

// Import icons
const GCashIcon = require('../../../../assets/images/gcash-icon.png')

const MenuItemDetails = () => {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const { item, concession, cafeteria, cafeteriaName } = route.params as any

	const [quantity, setQuantity] = useState(1)
	const [note, setNote] = useState('')
	const [diningOption, setDiningOption] = useState<'dine-in' | 'take-out'>(
		'dine-in'
	)
	const [paymentMethod, setPaymentMethod] = useState<'gcash' | 'on-counter'>(
		'on-counter'
	)
	const [groupedVariations, setGroupedVariations] = useState<any>({})
	const [loadingVariations, setLoadingVariations] = useState<boolean>(false)
	const [selectedVariations, setSelectedVariations] = useState<any[]>([])
	// Track quantities for variations with max_amount > 1
	const [variationQuantities, setVariationQuantities] = useState<
		Record<number, number>
	>({})
	const [placingOrder, setPlacingOrder] = useState(false)
	const [feedbacks, setFeedbacks] = useState<any[]>([])
	const [canLeaveFeedback, setCanLeaveFeedback] = useState<boolean>(false)
	const [eligibilityChecked, setEligibilityChecked] = useState<boolean>(false)
	const [feedbackRating, setFeedbackRating] = useState<number>(5)
	const [feedbackComment, setFeedbackComment] = useState<string>('')
	const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const [previewImage, setPreviewImage] = useState<string | null>(null)
	const user = useStore.getState().user
	const { showToast } = useToast()

	// Determine available payment methods
	const availablePaymentMethods = {
		gcash: item.gcash_payment_available || false,
		onCounter: item.oncounter_payment_available || false,
	}

	// Set default payment method based on availability
	useEffect(() => {
		if (!availablePaymentMethods.gcash && availablePaymentMethods.onCounter) {
			setPaymentMethod('on-counter')
		} else if (
			availablePaymentMethods.gcash &&
			!availablePaymentMethods.onCounter
		) {
			setPaymentMethod('gcash')
		}
	}, [availablePaymentMethods])

	// Fetch variations + feedbacks + feedback eligibility
	useEffect(() => {
		const fetchVariations = async () => {
			try {
				setLoadingVariations(true)
				const res = await api.get(`/item-variation-group/${item.id}`)
				const groups = res.data.data

				const grouped: any = {}
				for (const g of groups) {
					const vRes = await api.get(`/item-variation/group/${g.id}`)
					grouped[g.variation_group_name] = {
						...g,
						variations: vRes.data.data,
					}
				}
				setGroupedVariations(grouped)
			} catch (err) {
				console.error('Error fetching variations:', err)
				setGroupedVariations({})
			} finally {
				setLoadingVariations(false)
			}
		}

		const fetchFeedbacks = async () => {
			try {
				const res = await api.get(`/feedback/${item.id}`)
				setFeedbacks(res.data)
			} catch (err: any) {
				console.log('No feedback found', err.response?.data?.message || '')
				setFeedbacks([])
			}
		}

		const checkEligibility = async () => {
			try {
				if (!user?.id) return
				const res = await api.get(`/feedback/can-leave/${item.id}/${user.id}`)
				setCanLeaveFeedback(!!res.data?.canLeave)
			} catch (err) {
				console.error('Error checking feedback eligibility:', err)
				setCanLeaveFeedback(false)
			} finally {
				setEligibilityChecked(true)
			}
		}

		fetchVariations()
		fetchFeedbacks()
		checkEligibility()
	}, [item.id, user?.id])

	const onRefresh = async () => {
		try {
			setRefreshing(true)

			// Reload variations
			try {
				setLoadingVariations(true)
				const res = await api.get(`/item-variation-group/${item.id}`)
				const groups = res.data.data

				const grouped: any = {}
				for (const g of groups) {
					const vRes = await api.get(`/item-variation/group/${g.id}`)
					grouped[g.variation_group_name] = {
						...g,
						variations: vRes.data.data,
					}
				}
				setGroupedVariations(grouped)
				// Clear selections so user re-selects based on the latest options
				setSelectedVariations([])
				setVariationQuantities({})
			} catch (err) {
				console.error('Error refreshing variations:', err)
				setGroupedVariations({})
			} finally {
				setLoadingVariations(false)
			}

			// Reload feedbacks
			try {
				const res = await api.get(`/feedback/${item.id}`)
				setFeedbacks(res.data)
			} catch (err: any) {
				console.log(
					'No feedback found on refresh',
					err.response?.data?.message || ''
				)
				setFeedbacks([])
			}

			// Re-check feedback eligibility
			try {
				if (!user?.id) return
				const res = await api.get(`/feedback/can-leave/${item.id}/${user.id}`)
				setCanLeaveFeedback(!!res.data?.canLeave)
			} catch (err) {
				console.error('Error refreshing feedback eligibility:', err)
				setCanLeaveFeedback(false)
			} finally {
				setEligibilityChecked(true)
			}
		} finally {
			setRefreshing(false)
		}
	}

	const submitFeedback = async () => {
		try {
			if (!user?.id) {
				showToast('error', 'You must be logged in to leave feedback.')
				return
			}
			if (!canLeaveFeedback) {
				showToast(
					'error',
					'You can only leave feedback after completing an order for this item.'
				)
				return
			}
			if (feedbackRating < 1 || feedbackRating > 5) {
				showToast('error', 'Please select a rating between 1 and 5.')
				return
			}
			setSubmittingFeedback(true)
			await api.post(`/feedback`, {
				customer_id: user.id,
				menu_item_id: item.id,
				rating: feedbackRating,
				comment: feedbackComment || null,
			})
			setFeedbackComment('')
			setFeedbackRating(5)
			// refresh feedback list
			try {
				const res = await api.get(`/feedback/${item.id}`)
				setFeedbacks(res.data)
			} catch {}
			showToast('success', 'Your feedback has been submitted.')
		} catch (err: any) {
			const msg = err.response?.data?.message || 'Failed to submit feedback.'
			showToast('error', msg)
		} finally {
			setSubmittingFeedback(false)
		}
	}

	// Price calculation
	const basePrice = Number(item.price) || 0
	const takeOutFee = diningOption === 'take-out' ? (Number(item.take_out_additional_fee) || 0) : 0
	const variationTotal = selectedVariations.reduce((sum, v) => {
		const qty = variationQuantities[v.id] || 1
		return sum + Number(v.additional_price || 0) * qty
	}, 0)
	const displayPrice = (basePrice + variationTotal + takeOutFee) * quantity

	// Handle variation selection
	const toggleVariation = (group: any, variation: any) => {
		const maxAmount = variation.max_amount || 1
		const maxSelection = group.max_selection || 1
		const selectionsInGroup = selectedVariations.filter(
			(v) => v.group_id === group.id
		)
		const isSelected = selectedVariations.some((v) => v.id === variation.id)

		// Check if selection should be blocked
		if (!isSelected) {
			// If max_selection is 1, and another variation is already selected, show message
			// If max_selection is reached, show message
			if (selectionsInGroup.length >= maxSelection && maxSelection > 1) {
				showToast(
					'error',
					`You can only select up to ${maxSelection} option(s) from "${group.variation_group_name}". Please deselect an option first.`
				)
				return
			}
		}

		// If max_amount > 1, use quantity-based selection
		if (maxAmount > 1) {
			const currentQty = variationQuantities[variation.id] || 0
			if (currentQty > 0) {
				// Remove variation if quantity is being set to 0
				const newQuantities = { ...variationQuantities }
				delete newQuantities[variation.id]
				setVariationQuantities(newQuantities)
				setSelectedVariations(
					selectedVariations.filter((v) => v.id !== variation.id)
				)
			} else {
				// Add variation with quantity 1
				setVariationQuantities({ ...variationQuantities, [variation.id]: 1 })
				setSelectedVariations([
					...selectedVariations,
					{ ...variation, group_id: group.id },
				])
			}
			return
		}

		// For max_amount = 1, use the old toggle logic
		const alreadySelected = selectedVariations.find(
			(v) => v.id === variation.id
		)

		if (maxSelection > 1) {
			// Multiple selection allowed up to max_selection
			if (alreadySelected) {
				setSelectedVariations(
					selectedVariations.filter((v) => v.id !== variation.id)
				)
			} else {
				setSelectedVariations([
					...selectedVariations,
					{ ...variation, group_id: group.id },
				])
			}
		} else {
			// Single selection only
			if (alreadySelected) {
				setSelectedVariations(
					selectedVariations.filter((v) => v.group_id !== group.id)
				)
			} else {
				setSelectedVariations([
					...selectedVariations.filter((v) => v.group_id !== group.id),
					{ ...variation, group_id: group.id },
				])
			}
		}
	}

	// Handle variation quantity changes (for max_amount > 1)
	const updateVariationQuantity = (variation: any, delta: number) => {
		const currentQty = variationQuantities[variation.id] || 0
		const maxAmount = variation.max_amount || 1

		// Find the group this variation belongs to
		const group = Object.values(groupedVariations).find((g: any) =>
			g.variations.some((v: any) => v.id === variation.id)
		) as any

		if (!group) return

		const maxSelection = group.max_selection || 1
		const selectionsInGroup = selectedVariations.filter(
			(v) => v.group_id === group.id
		)

		// Check if trying to add when max_selection is reached
		if (delta > 0 && currentQty === 0) {
			// Trying to add a new variation
			if (maxSelection === 1 && selectionsInGroup.length > 0) {
				showToast(
					'error',
					`You can only select 1 option from "${group.variation_group_name}". Please deselect the current selection first.`
				)
				return
			}
			if (selectionsInGroup.length >= maxSelection) {
				showToast(
					'error',
					`You can only select up to ${maxSelection} option(s) from "${group.variation_group_name}". Please deselect an option first.`
				)
				return
			}
		}

		const newQty = Math.max(0, Math.min(maxAmount, currentQty + delta))

		if (newQty === 0) {
			// Remove variation
			const newQuantities = { ...variationQuantities }
			delete newQuantities[variation.id]
			setVariationQuantities(newQuantities)
			setSelectedVariations(
				selectedVariations.filter((v) => v.id !== variation.id)
			)
		} else {
			// Update quantity
			setVariationQuantities({ ...variationQuantities, [variation.id]: newQty })
			// Ensure variation is in selectedVariations
			if (!selectedVariations.find((v) => v.id === variation.id)) {
				setSelectedVariations([
					...selectedVariations,
					{ ...variation, group_id: group.id },
				])
			}
		}
	}

	// Submit order/cart
	const submitOrder = async (inCart: boolean) => {
		try {
			if (!user) {
				showToast('error', 'You must be logged in to place an order.')
				return
			}

			// Prevent ordering while variations are still loading
			if (loadingVariations) {
				showToast(
					'error',
					'Please wait while item options are loading before placing your order.'
				)
				return
			}

			// If this item is known to have required variations but none were loaded,
			// block ordering to avoid creating invalid orders without required options.
			const itemHasRequiredVariations =
				Array.isArray((item as any).variations) &&
				(item as any).variations.some(
					(g: any) => !!g?.required_selection || (g?.min_selection || 0) > 0
				)
			const hasLoadedVariationGroups =
				Object.keys(groupedVariations || {}).length > 0

			if (!hasLoadedVariationGroups && itemHasRequiredVariations) {
				showToast(
					'error',
					'Required options for this item failed to load. Please go back and reopen this item or try again later.'
				)
				return
			}

			setPlacingOrder(true)

			// Validate required selections, min_selection, and max_selection
			for (const [groupName, group] of Object.entries<any>(groupedVariations)) {
				const selectionsInGroup = selectedVariations.filter(
					(v) => v.group_id === group.id
				)
				const minSelection = group.min_selection || 0
				const maxSelection = group.max_selection || 1
				const requiredSelection = group.required_selection || false

				// If a group is marked as required but has no options, prevent ordering
				if (
					requiredSelection &&
					(!Array.isArray(group.variations) || group.variations.length === 0)
				) {
					setPlacingOrder(false)
					showToast(
						'error',
						`Required options for "${groupName}" are currently unavailable. Please try again later.`
					)
					return
				}

				// Check required selection
				if (requiredSelection && selectionsInGroup.length === 0) {
					setPlacingOrder(false)
					showToast(
						'error',
						`Please select at least one option from "${groupName}".`
					)
					return
				}

				// Check min_selection
				if (selectionsInGroup.length < minSelection) {
					setPlacingOrder(false)
					showToast(
						'error',
						`Please select at least ${minSelection} option(s) from "${groupName}".`
					)
					return
				}

				// Check max_selection limit
				if (selectionsInGroup.length > maxSelection) {
					setPlacingOrder(false)
					showToast(
						'error',
						`You can only select up to ${maxSelection} option(s) from "${groupName}".`
					)
					return
				}
			}

			// Validate payment method availability
			if (paymentMethod === 'gcash' && !availablePaymentMethods.gcash) {
				setPlacingOrder(false)
				showToast(
					'error',
					'GCash payment is not available for this concession.'
				)
				return
			}
			if (
				paymentMethod === 'on-counter' &&
				!availablePaymentMethods.onCounter
			) {
				setPlacingOrder(false)
				showToast(
					'error',
					'On-counter payment is not available for this concession.'
				)
				return
			}

			// Create order
			const orderRes = await api.post('/order', {
				customer_id: user.id,
				concession_id: item.concession_id,
				order_status: inCart ? 'cart' : 'pending',
				total_price: 0,
				in_cart: inCart,
				payment_method: paymentMethod,
			})

			const orderId = orderRes.data.id

			// Add order detail
			const detailRes = await api.post('/order-detail', {
				order_id: orderId,
				item_id: item.id,
				quantity,
				item_price: item.price,
				total_price: displayPrice,
				note,
				dining_option: diningOption,
			})

			const orderDetailId = detailRes.data.id

			// Add variations (send quantity once per variation)
			for (const v of selectedVariations) {
				const qty = variationQuantities[v.id] || 1
				await api.post('/order-item-variation', {
					order_detail_id: orderDetailId,
					variation_id: v.id,
					quantity: qty,
				})
			}

			await api.put(`/order/${orderId}/recalculate`)

			// Notify concessionaire for direct order placement (not via cart checkout)
			if (!inCart) {
				try {
					await api.post(`/order/${orderId}/notify`)
				} catch (notifyErr) {
					console.error('Failed to notify concessionaire:', notifyErr)
				}
			}

			showToast(
				'success',
				inCart ? 'Item added to cart!' : 'Order placed successfully!'
			)
			if (!inCart) {
				// Redirect directly to the newly created order details
				;(navigation as any).navigate('Orders', {
					screen: 'View Order',
					params: { orderId },
				})
			}
		} catch (err: any) {
			console.error(err.response?.data || err)
			showToast(
				'error',
				err.response?.data?.message ?? 'Failed to submit order.'
			)
		} finally {
			setPlacingOrder(false)
		}
	}

	return (
		<KeyboardAvoidingView
			style={{ flex: 1 }}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
			<ScrollView
				style={styles.container}
				contentContainerStyle={{ paddingBottom: 120 }}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor="#A40C2D"
						colors={['#A40C2D']}
					/>
				}>
				{/* Item Header */}
				<TouchableOpacity
					activeOpacity={0.85}
					onPress={() => setPreviewImage(item.image_url || null)}>
					<Image
						source={{ uri: item.image_url }}
						style={styles.image}
					/>
				</TouchableOpacity>

				{/* Content with padding */}
				<View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
					<Text style={styles.title}>{item.item_name}</Text>

					{/* Cafeteria + Concession */}
					<Text style={styles.subText}>
						{cafeteria?.cafeteria_name || cafeteriaName || item?.cafeteria_name}{' '}
						•{' '}
						{concession ?
							<Text
								style={styles.link}
								onPress={() =>
									navigation.navigate('View Concession', {
										concession,
										cafeteria,
									})
								}>
								{concession?.concession_name}
							</Text>
						:	<Text style={styles.link}>{item?.concession_name || ''}</Text>}
					</Text>

					{item.description && (
						<Text style={styles.desc}>{item.description}</Text>
					)}
				</View>

				{/* Dining Option */}
				<View style={styles.diningOptionContainer}>
					<Text style={styles.diningOptionTitle}>Dining Option</Text>
					<View style={styles.diningOptionButtons}>
						<TouchableOpacity
							style={[
								styles.diningOptionButton,
								diningOption === 'dine-in' && styles.diningOptionSelected,
							]}
							onPress={() => setDiningOption('dine-in')}>
							<Text
								style={[
									styles.diningOptionText,
									diningOption === 'dine-in' && styles.diningOptionTextSelected,
								]}>
								<Ionicons
									name="restaurant-outline"
									size={14}
									color={diningOption === 'dine-in' ? '#A40C2D' : '#666'}
									style={styles.inlineIcon}
								/>{' '}
								Dine In
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.diningOptionButton,
								diningOption === 'take-out' && styles.diningOptionSelected,
							]}
							onPress={() => setDiningOption('take-out')}>
							<Text
								style={[
									styles.diningOptionText,
									diningOption === 'take-out' &&
										styles.diningOptionTextSelected,
								]}>
								<Ionicons
									name="cube-outline"
									size={14}
									color={diningOption === 'take-out' ? '#A40C2D' : '#666'}
									style={styles.inlineIcon}
								/>{' '}
								Take Out
								{item.take_out_additional_fee && Number(item.take_out_additional_fee) > 0 && (
									<Text style={styles.takeOutFeeText}>
										{' '}+₱{Number(item.take_out_additional_fee).toFixed(2)}
									</Text>
								)}
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Variations */}
				{loadingVariations ?
					<View style={styles.loadingContainer}>
						<ActivityIndicator
							size="large"
							color="#A40C2D"
						/>
						<Text style={styles.loadingText}>Loading item options...</Text>
					</View>
				:	Object.entries<any>(groupedVariations).map(([groupName, group]) => {
						const selectionsInGroup = selectedVariations.filter(
							(v) => v.group_id === group.id
						)
						const maxSelection = group.max_selection || 1
						const minSelection = group.min_selection || 0

						// Determine if variations should be disabled
						const isMaxSelectionReached =
							selectionsInGroup.length >= maxSelection

						return (
							<View
								key={group.id}
								style={styles.group}>
								<Text style={styles.groupTitle}>
									{groupName}{' '}
									{group.required_selection && (
										<Text style={styles.required}>*Required</Text>
									)}
								</Text>
								{maxSelection > 1 && (
									<Text style={styles.selectionCounter}>
										Selected: {selectionsInGroup.length} / {maxSelection}
									</Text>
								)}
								{group.variations.map((variation: any) => {
									const maxAmount = variation.max_amount || 1
									const variationQty = variationQuantities[variation.id] || 0
									const showQuantityControls = maxAmount > 1
									const isSelected =
										showQuantityControls ?
											variationQty > 0
										:	selectedVariations.some((v) => v.id === variation.id)

									// Determine if this variation should be unclickable (but not visually disabled)
									let isUnclickable = false
									if (!isSelected) {
										// If max_selection is 1, make unselected variations unclickable when any is selected
										if (maxSelection === 1 && selectionsInGroup.length > 0) {
										}
										// If max_selection is reached, make all unselected variations unclickable
										else if (isMaxSelectionReached && maxSelection > 1) {
											isUnclickable = true
										}
									}

									// Use composite key to ensure uniqueness across groups
									const uniqueKey = `${group.id}-${variation.id}`

									return (
										<View
											key={uniqueKey}
											style={[
												styles.option,
												isSelected && styles.optionSelected,
											]}>
											<TouchableOpacity
												style={styles.variationContent}
												onPress={() => {
													if (showQuantityControls) return
													if (isUnclickable) {
														if (maxSelection === 1) {
															showToast(
																'error',
																`You can only select 1 option from "${groupName}". Please deselect the current selection first.`
															)
														} else {
															showToast(
																'error',
																`You can only select up to ${maxSelection} option(s) from "${groupName}". Please deselect an option first.`
															)
														}
														return
													}
													toggleVariation(group, variation)
												}}
												disabled={showQuantityControls}>
												{variation.image_url && (
													<TouchableOpacity
														activeOpacity={0.85}
														onPress={() =>
															setPreviewImage(variation.image_url || null)
														}>
														<Image
															source={{ uri: variation.image_url }}
															style={styles.variationImage}
															resizeMode="cover"
														/>
													</TouchableOpacity>
												)}
												<View style={styles.variationTextContainer}>
													<Text style={styles.variationName}>
														{variation.variation_name}
													</Text>
													<Text style={styles.variationPrice}>
														+₱{variation.additional_price}
													</Text>
												</View>
											</TouchableOpacity>
											{showQuantityControls ?
												<View style={styles.variationQuantityContainer}>
													<TouchableOpacity
														style={[
															styles.variationQtyButton,
															variationQty === 0 &&
																styles.variationQtyButtonDisabled,
														]}
														onPress={() =>
															updateVariationQuantity(variation, -1)
														}
														disabled={variationQty === 0}>
														<Text
															style={[
																styles.variationQtyButtonText,
																variationQty === 0 &&
																	styles.variationQtyButtonTextDisabled,
															]}>
															−
														</Text>
													</TouchableOpacity>
													<Text style={styles.variationQtyValue}>
														{variationQty}
													</Text>
													<TouchableOpacity
														style={[
															styles.variationQtyButton,
															variationQty >= maxAmount &&
																styles.variationQtyButtonDisabled,
														]}
														onPress={() => {
															if (isUnclickable && variationQty === 0) {
																if (maxSelection === 1) {
																	showToast(
																		'error',
																		`You can only select 1 option from "${groupName}". Please deselect the current selection first.`
																	)
																} else {
																	showToast(
																		'error',
																		`You can only select up to ${maxSelection} option(s) from "${groupName}". Please deselect an option first.`
																	)
																}
																return
															}
															updateVariationQuantity(variation, 1)
														}}
														disabled={variationQty >= maxAmount}>
														<Text
															style={[
																styles.variationQtyButtonText,
																variationQty >= maxAmount &&
																	styles.variationQtyButtonTextDisabled,
															]}>
															+
														</Text>
													</TouchableOpacity>
												</View>
											:	null}
										</View>
									)
								})}
							</View>
						)
					})
				}

				{/* Note */}
				<View style={styles.noteContainer}>
					<Text style={styles.noteLabel}>Add Note:</Text>
					<TextInput
						style={styles.noteInput}
						placeholder="e.g. No onions, extra spicy..."
						value={note}
						onChangeText={setNote}
						multiline
					/>
				</View>

				{/* Order Summary Section */}
				<View style={styles.orderSummaryContainer}>
					{/* Quantity & Price */}
					<View style={styles.quantitySection}>
						<View style={styles.quantityHeader}>
							<Text style={styles.quantityLabel}>Quantity</Text>
							<Text style={styles.priceInQuantity}>
								₱{displayPrice.toFixed(2)}
							</Text>
						</View>
						<View style={styles.quantityControls}>
							<TouchableOpacity
								style={styles.qtyBtn}
								onPress={() => setQuantity(Math.max(1, quantity - 1))}>
								<Ionicons name="remove" size={20} color="#fff" />
							</TouchableOpacity>
							<Text style={styles.qtyValue}>{quantity}</Text>
							<TouchableOpacity
								style={styles.qtyBtn}
								onPress={() => setQuantity(quantity + 1)}>
								<Ionicons name="add" size={20} color="#fff" />
							</TouchableOpacity>
						</View>
					</View>

					{/* Divider */}
					<View style={styles.divider} />

					{/* Payment Method */}
					<View style={styles.paymentMethodSection}>
						<Text style={styles.paymentMethodTitle}>Payment Method</Text>
						{(
							!availablePaymentMethods.gcash && !availablePaymentMethods.onCounter
						) ?
							<Text style={styles.noPaymentMethodsText}>
								No payment methods are currently available for this concession.
							</Text>
						:	<>
								<View style={styles.paymentMethodButtons}>
									{availablePaymentMethods.gcash && (
										<TouchableOpacity
											style={[
												styles.paymentMethodButton,
												paymentMethod === 'gcash' &&
													styles.paymentMethodSelected,
											]}
											onPress={() => setPaymentMethod('gcash')}>
											<View style={styles.paymentMethodContent}>
												<Ionicons
													name="wallet-outline"
													size={16}
													color={
														paymentMethod === 'gcash' ? '#A40C2D' : '#64748b'
													}
													style={styles.paymentMethodIcon}
												/>
												<Text
													style={[
														styles.paymentMethodText,
														paymentMethod === 'gcash' &&
															styles.paymentMethodTextSelected,
													]}>
													GCash
												</Text>
											</View>
										</TouchableOpacity>
									)}
									{availablePaymentMethods.onCounter && (
										<TouchableOpacity
											style={[
												styles.paymentMethodButton,
												paymentMethod === 'on-counter' &&
													styles.paymentMethodSelected,
											]}
											onPress={() => setPaymentMethod('on-counter')}>
											<View style={styles.paymentMethodContent}>
												<Ionicons
													name="cash-outline"
													size={16}
													color={
														paymentMethod === 'on-counter' ? '#A40C2D' : '#64748b'
													}
													style={styles.paymentMethodIcon}
												/>
												<Text
													style={[
														styles.paymentMethodText,
														paymentMethod === 'on-counter' &&
															styles.paymentMethodTextSelected,
													]}>
													On Counter
												</Text>
											</View>
										</TouchableOpacity>
									)}
								</View>
								{paymentMethod === 'gcash' && (
									<Text style={styles.gcashNumberText}>
										GCash Number: 0945-424-6367
									</Text>
								)}
							</>}
					</View>
				</View>

				{/* Buttons */}
				<TouchableOpacity
					style={[
						styles.btn,
						!availablePaymentMethods.gcash &&
							!availablePaymentMethods.onCounter &&
							styles.btnDisabled,
					]}
					onPress={() => submitOrder(true)}
					disabled={
						placingOrder ||
						(!availablePaymentMethods.gcash &&
							!availablePaymentMethods.onCounter)
					}>
					<Text
						style={[
							styles.btnText,
							!availablePaymentMethods.gcash &&
								!availablePaymentMethods.onCounter &&
								styles.btnTextDisabled,
						]}>
						Add to Cart
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.btn,
						styles.btnAlt,
						!availablePaymentMethods.gcash &&
							!availablePaymentMethods.onCounter &&
							styles.btnDisabled,
					]}
					onPress={() => submitOrder(false)}
					disabled={
						placingOrder ||
						(!availablePaymentMethods.gcash &&
							!availablePaymentMethods.onCounter)
					}>
					<Text
						style={[
							styles.btnText,
							!availablePaymentMethods.gcash &&
								!availablePaymentMethods.onCounter &&
								styles.btnTextDisabled,
						]}>
						Place Order
					</Text>
				</TouchableOpacity>

				{/* Feedback Section */}
				<View style={styles.feedbackContainer}>
					<Text style={styles.feedbackTitle}>Customer Feedback</Text>
					{eligibilityChecked && !canLeaveFeedback ?
						<Text style={styles.feedbackInfo}>
							Only customers who have completed an order for this item can leave
							feedback.
						</Text>
					:	null}
					{eligibilityChecked && canLeaveFeedback ?
						<View style={{ gap: 8, marginBottom: 10 }}>
							<Text style={{ fontWeight: '600' }}>Add Feedback</Text>
							<View style={styles.ratingRow}>
								{[1, 2, 3, 4, 5].map((n) => (
									<TouchableOpacity
										key={n}
										onPress={() => setFeedbackRating(n)}>
										<Text
											style={[
												styles.star,
												feedbackRating >= n && styles.starActive,
											]}>
											*
										</Text>
									</TouchableOpacity>
								))}
							</View>
							<TextInput
								style={styles.feedbackInput}
								placeholder="Share your experience (optional)"
								value={feedbackComment}
								onChangeText={setFeedbackComment}
								multiline
							/>
							<View style={{ flexDirection: 'row', gap: 10 }}>
								<TouchableOpacity
									style={[styles.btn, styles.btnAlt, { flex: 1 }]}
									disabled={submittingFeedback}
									onPress={submitFeedback}>
									<Text style={styles.btnText}>
										{submittingFeedback ? 'Submitting...' : 'Submit'}
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[styles.btn, { flex: 1 }]}
									disabled={submittingFeedback}
									onPress={() => {
										setFeedbackComment('')
										setFeedbackRating(5)
									}}>
									<Text style={styles.btnText}>Clear</Text>
								</TouchableOpacity>
							</View>
						</View>
					:	null}
					{feedbacks.length === 0 ?
						<Text style={styles.noFeedback}>No feedback yet.</Text>
					:	feedbacks.map((fb) => (
							<View
								key={fb.id}
								style={styles.feedbackCard}>
								<View style={styles.feedbackHeader}>
									{fb.profile_image ?
										<Image
											source={{ uri: fb.profile_image }}
											style={styles.profileImage}
										/>
									:	<View style={styles.profilePlaceholder}>
											<Text style={styles.profileInitials}>
												{fb.first_name?.[0]}
												{fb.last_name?.[0]}
											</Text>
										</View>
									}
									<View style={{ flex: 1 }}>
										<Text style={styles.feedbackUser}>
											{fb.customer_id === user?.id ?
												`${fb.first_name} ${fb.last_name} (You)`
											:	`${fb.first_name} ${fb.last_name}`}
										</Text>
										<Text style={styles.feedbackRating}>⭐ {fb.rating}</Text>
										{/* Star icon text kept simple without emoji */}
									</View>
								</View>
								{fb.comment && (
									<Text style={styles.feedbackComment}>{fb.comment}</Text>
								)}
								<Text style={styles.feedbackDate}>
									{new Date(fb.created_at).toLocaleString()}
								</Text>
							</View>
						))
					}
				</View>
			</ScrollView>

			<ImagePreviewModal
				visible={!!previewImage}
				imageUrl={previewImage}
				title={item.item_name}
				onClose={() => setPreviewImage(null)}
			/>
		</KeyboardAvoidingView>
	)
}

const styles = StyleSheet.create({
	container: { 
		flex: 1, 
		backgroundColor: '#f8fafc',
	},
	image: {
		width: '100%',
		height: 280,
		backgroundColor: '#f1f5f9',
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: '#0f172a',
		marginBottom: 12,
		lineHeight: 26,
	},
	subText: { 
		fontSize: 14, 
		color: '#64748b', 
		marginBottom: 16,
		lineHeight: 18,
	},
	link: { 
		color: '#A40C2D', 
		fontWeight: '600',
		textDecorationLine: 'underline',
	},

	qtyBtn: {
		width: 36,
		height: 36,
		backgroundColor: '#A40C2D',
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		marginHorizontal: 12,
		shadowColor: '#A40C2D',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 3,
	},
	qtyText: { 
		color: '#fff', 
		fontSize: 20, 
		fontWeight: 'bold' 
	},
	qtyValue: {
		fontSize: 20,
		fontWeight: '700',
		minWidth: 40,
		textAlign: 'center',
		color: '#1e293b',
	},

	desc: {
		fontSize: 14,
		color: '#475569',
		lineHeight: 20,
		marginBottom: 20,
	},

	diningOptionContainer: {
		backgroundColor: '#fff',
		padding: 20,
		marginHorizontal: 20,
		borderRadius: 16,
		marginBottom: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 12,
		elevation: 4,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	diningOptionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#0f172a',
		marginBottom: 16,
	},
	diningOptionButtons: { 
		flexDirection: 'row', 
		gap: 12 
	},
	diningOptionButton: {
		flex: 1,
		paddingVertical: 16,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: '#e2e8f0',
		backgroundColor: '#fff',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.03,
		shadowRadius: 3,
		elevation: 1,
	},
	diningOptionSelected: {
		borderColor: '#A40C2D',
		backgroundColor: '#fef2f2',
		shadowColor: '#A40C2D',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 6,
		elevation: 3,
	},
	diningOptionText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#64748b',
	},
	inlineIcon: {
		width: 16,
		height: 16,
		marginRight: 8,
	},
	diningOptionTextSelected: {
		color: '#A40C2D',
		fontWeight: '700',
	},
	takeOutFeeText: {
		fontSize: 12,
		color: '#A40C2D',
		fontWeight: '700',
		backgroundColor: '#fef2f2',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
		marginLeft: 4,
	},

	orderSummaryContainer: {
		backgroundColor: '#fff',
		marginHorizontal: 20,
		marginBottom: 20,
		borderRadius: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 12,
		elevation: 4,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	quantitySection: {
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	divider: {
		height: 1,
		backgroundColor: '#f1f5f9',
		marginHorizontal: 20,
	},
	paymentMethodSection: {
		padding: 20,
	},
	paymentMethodContainer: {
		backgroundColor: '#fff',
		padding: 20,
		marginHorizontal: 20,
		borderRadius: 16,
		marginBottom: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 12,
		elevation: 4,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	paymentMethodTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#0f172a',
		marginBottom: 16,
	},
	paymentMethodButtons: { 
		flexDirection: 'row', 
		gap: 12 
	},
	paymentMethodButton: {
		flex: 1,
		paddingVertical: 16,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: '#e2e8f0',
		backgroundColor: '#fff',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.03,
		shadowRadius: 3,
		elevation: 1,
	},
	paymentMethodSelected: {
		borderColor: '#A40C2D',
		backgroundColor: '#fef2f2',
		shadowColor: '#A40C2D',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 6,
		elevation: 3,
	},
	paymentMethodText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#64748b',
	},
	paymentMethodTextSelected: {
		color: '#A40C2D',
		fontWeight: '700',
	},
	gcashNumberText: {
		fontSize: 13,
		color: '#64748b',
		marginTop: 12,
		textAlign: 'center',
		fontStyle: 'italic',
		backgroundColor: '#f8fafc',
		padding: 8,
		borderRadius: 8,
	},
	paymentMethodContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	paymentMethodIcon: {
		width: 16,
		height: 16,
		marginRight: 6,
	},
	noPaymentMethodsText: {
		fontSize: 14,
		color: '#ff6b6b',
		textAlign: 'center',
		fontStyle: 'italic',
		padding: 10,
		backgroundColor: '#ffe0e0',
		borderRadius: 8,
	},

	group: {
		backgroundColor: '#fff',
		padding: 20,
		marginHorizontal: 20,
		borderRadius: 16,
		marginBottom: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 12,
		elevation: 4,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	groupTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#0f172a',
		marginBottom: 16,
	},
	required: { 
		color: '#dc2626', 
		fontSize: 13,
		fontWeight: '600',
		marginLeft: 4,
	},
	multiple: { 
		fontSize: 12, 
		color: '#64748b', 
		marginLeft: 8,
		fontStyle: 'italic',
	},
	selectionCounter: {
		fontSize: 12,
		color: '#64748b',
		marginTop: 8,
		fontWeight: '500',
		backgroundColor: '#f1f5f9',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		alignSelf: 'flex-start',
	},
	option: {
		padding: 14,
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		marginBottom: 10,
		flexDirection: 'row',
		alignItems: 'center',
	},
	optionSelected: {
		backgroundColor: '#fef2f2',
		borderWidth: 2,
		borderColor: '#A40C2D',
		shadowColor: '#A40C2D',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 6,
		elevation: 2,
	},
	variationContent: { 
		flexDirection: 'row', 
		alignItems: 'center', 
		flex: 1,
	},
	variationImage: { 
		width: 60, 
		height: 60, 
		borderRadius: 12, 
		marginRight: 14,
		backgroundColor: '#f1f5f9',
	},
	variationTextContainer: { 
		flex: 1,
		justifyContent: 'center',
	},
	variationName: { 
		fontSize: 15, 
		fontWeight: '600',
		color: '#1e293b',
		marginBottom: 2,
	},
	variationPrice: { 
		fontSize: 13, 
		color: '#059669', 
		fontWeight: '700',
		backgroundColor: '#ecfdf5',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
		alignSelf: 'flex-start',
	},
	variationQuantityContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 14,
		backgroundColor: '#f8fafc',
		padding: 4,
		borderRadius: 10,
	},
	variationQtyButton: {
		width: 28,
		height: 28,
		backgroundColor: '#A40C2D',
		borderRadius: 7,
		justifyContent: 'center',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 1,
	},
	variationQtyButtonDisabled: {
		backgroundColor: '#cbd5e1',
		shadowOpacity: 0,
		elevation: 0,
	},
	variationQtyButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
	},
	variationQtyButtonTextDisabled: {
		color: '#94a3b8',
	},
	variationQtyValue: {
		fontSize: 16,
		fontWeight: '700',
		marginHorizontal: 10,
		minWidth: 24,
		textAlign: 'center',
		color: '#1e293b',
	},

noteContainer: {
		backgroundColor: '#fff',
		padding: 20,
		marginHorizontal: 20,
		borderRadius: 16,
		marginBottom: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 12,
		elevation: 4,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	noteLabel: {
		fontSize: 16,
		fontWeight: '600',
		color: '#0f172a',
		marginBottom: 12,
	},
	noteInput: {
		backgroundColor: '#f8fafc',
		borderWidth: 2,
		borderColor: '#e2e8f0',
		borderRadius: 12,
		padding: 16,
		minHeight: 90,
		textAlignVertical: 'top',
		fontSize: 14,
		color: '#1e293b',
		lineHeight: 20,
	},

quantityHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	quantityLabel: {
		fontSize: 16,
		fontWeight: '600',
		color: '#0f172a',
	},
	priceInQuantity: {
		fontSize: 20,
		fontWeight: '700',
		color: '#A40C2D',
		backgroundColor: '#fef2f2',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 10,
	},
	quantityControls: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f8fafc',
		padding: 8,
		borderRadius: 16,
	},

	btn: {
		backgroundColor: '#A40C2D',
		paddingVertical: 18,
		paddingHorizontal: 32,
		borderRadius: 16,
		alignItems: 'center',
		marginHorizontal: 20,
		marginBottom: 16,
		shadowColor: '#A40C2D',
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.4,
		shadowRadius: 12,
		elevation: 6,
		borderWidth: 1,
		borderColor: '#A40C2D80',
	},
	btnAlt: {
		backgroundColor: '#64748b',
		shadowColor: '#64748b',
		borderColor: '#64748b80',
	},
	btnDisabled: {
		backgroundColor: '#cbd5e1',
		opacity: 0.7,
		shadowOpacity: 0,
		elevation: 0,
		borderColor: '#cbd5e1',
	},
	btnText: { 
		color: '#fff', 
		fontWeight: '700', 
		fontSize: 16,
		letterSpacing: 0.5,
	},
	btnTextDisabled: { 
		color: '#94a3b8',
		fontWeight: '600',
	},

	feedbackContainer: { 
		marginTop: 24,
		marginHorizontal: 20,
	},
	feedbackTitle: { 
		fontSize: 18, 
		fontWeight: '700', 
		marginBottom: 16,
		color: '#0f172a',
	},
	feedbackInfo: { 
		color: '#64748b', 
		fontSize: 14, 
		marginBottom: 12,
		backgroundColor: '#f1f5f9',
		padding: 12,
		borderRadius: 8,
	},
	noFeedback: { 
		color: '#94a3b8', 
		fontStyle: 'italic',
		textAlign: 'center',
		padding: 20,
	},
	feedbackCard: {
		backgroundColor: '#fff',
		padding: 16,
		borderRadius: 12,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 6,
		elevation: 2,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	loadingContainer: {
		backgroundColor: '#fff',
		padding: 40,
		marginHorizontal: 20,
		borderRadius: 16,
		marginBottom: 20,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 12,
		elevation: 4,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	loadingText: {
		marginTop: 12,
		fontSize: 16,
		color: '#64748b',
		fontWeight: '500',
	},

	feedbackHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	profileImage: { 
		width: 44, 
		height: 44, 
		borderRadius: 22, 
		marginRight: 12,
		borderWidth: 2,
		borderColor: '#f1f5f9',
	},
	profilePlaceholder: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: '#f1f5f9',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
		borderWidth: 2,
		borderColor: '#e2e8f0',
	},
	profileInitials: { 
		color: '#64748b', 
		fontWeight: '700',
		fontSize: 16,
	},
	feedbackUser: { 
		fontWeight: '700',
		fontSize: 15,
		color: '#1e293b',
	},
	feedbackRating: { 
		color: '#fbbf24',
		fontSize: 14,
	},
	feedbackComment: { 
		color: '#475569', 
		marginVertical: 6,
		lineHeight: 18,
		fontSize: 14,
	},
	feedbackDate: { 
		fontSize: 12, 
		color: '#94a3b8',
		marginTop: 4,
	},
	feedbackModal: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		backgroundColor: '#0006',
		justifyContent: 'center',
		alignItems: 'center',
	},
	feedbackModalCard: {
		width: '90%',
		backgroundColor: '#fff',
		borderRadius: 10,
		padding: 16,
		gap: 10,
	},
	feedbackModalTitle: { fontSize: 16, fontWeight: 'bold', color: '#A40C2D' },
	ratingRow: { flexDirection: 'row', gap: 6, marginVertical: 6 },
	star: { fontSize: 24, color: '#ccc' },
	starActive: { color: '#FFD700' },
	feedbackInput: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 10,
		minHeight: 60,
	},
})

export default MenuItemDetails
