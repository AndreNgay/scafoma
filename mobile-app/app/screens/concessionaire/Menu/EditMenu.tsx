// screens/Menu/EditMenu.tsx
import React, { useState, useEffect } from 'react'
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	Image,
	Switch,
	ActivityIndicator,
	Modal,
	Alert,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { z } from 'zod'
import api from '../../../libs/apiCall'
import { useToast } from '../../../contexts/ToastContext'
import {
	sanitizeCurrencyInput,
	normalizeCurrencyValue,
} from '../../../utils/currency'

type Variation = {
	name: string
	price: string
	max_amount?: number
	image?: any
	image_url?: string
	variation_id?: number
	available?: boolean
}
type VariationGroup = {
	label: string
	variations: Variation[]
	required_selection: boolean
	min_selection: number
	max_selection: number | null
}

const EditMenu: React.FC = () => {
	const route = useRoute<any>()
	const { menuItem } = route.params
	const navigation = useNavigation<any>()
	const [currentPage, setCurrentPage] = useState(1)

	const [itemName, setItemName] = useState(menuItem?.item_name || '')
	const initialPrice = normalizeCurrencyValue(
		menuItem?.price != null ? String(menuItem.price) : '0'
	)
	const [price, setPrice] = useState(initialPrice)
	const [category, setCategory] = useState(menuItem?.category || '')
	const [availability, setAvailability] = useState(
		menuItem?.availability !== undefined ? menuItem.availability : true
	)
	const [image, setImage] = useState<any>(
		menuItem?.image_url ? { uri: menuItem.image_url } : null
	)
	const [variationGroups, setVariationGroups] = useState<VariationGroup[]>([])
	const [loading, setLoading] = useState(false)
	const [variationGroupsLoading, setVariationGroupsLoading] = useState(true)
	const [existingCategories, setExistingCategories] = useState<string[]>([])
	const { showToast } = useToast()
	const initialTakeOutFee = normalizeCurrencyValue(
		menuItem?.take_out_additional_fee != null ? String(menuItem.take_out_additional_fee) : '0'
	)
	const [takeOutAdditionalFee, setTakeOutAdditionalFee] = useState(initialTakeOutFee)

	const [importModalVisible, setImportModalVisible] = useState(false)
	const [importItemsLoading, setImportItemsLoading] = useState(false)
	const [importSourceItems, setImportSourceItems] = useState<any[]>([])
	const [importFromItemLoading, setImportFromItemLoading] = useState(false)

	// State for selection requirements modal
	const [requirementModalVisible, setRequirementModalVisible] = useState(false)
	const [currentGroupIndex, setCurrentGroupIndex] = useState<number | null>(null)
	const [currentVariationIndex, setCurrentVariationIndex] = useState<number | null>(null)
	const [requirementModalStep, setRequirementModalStep] = useState(1) // 1 = require/optional, 2 = how many required, 3 = max selection limit, 4 = max selection amount, 5 = max amount limit, 6 = max amount value
	const [tempMinSelection, setTempMinSelection] = useState('1')
	const [tempMaxSelection, setTempMaxSelection] = useState('')
	const [tempMaxAmount, setTempMaxAmount] = useState('')

	const handlePriceChange = (value: string) => {
		setPrice(sanitizeCurrencyInput(value))
	}

	const handleTakeOutFeeChange = (value: string) => {
		setTakeOutAdditionalFee(sanitizeCurrencyInput(value))
	}

	const ensurePriceFallback = () => {
		setPrice((prev) => normalizeCurrencyValue(prev))
	}

	const ensureTakeOutFeeFallback = () => {
		setTakeOutAdditionalFee((prev) => normalizeCurrencyValue(prev))
	}

	// Validate general details before proceeding to variations
	const validateGeneralDetails = () => {
		if (!itemName.trim()) {
			showToast('error', 'Please fill in item name.')
			return false
		}
		return true
	}

	// Navigate to next page
	const goToNextPage = () => {
		if (currentPage === 1 && !validateGeneralDetails()) {
			return
		}
		setCurrentPage(currentPage + 1)
	}

	// Navigate to previous page
	const goToPreviousPage = () => {
		setCurrentPage(currentPage - 1)
	}

	const showRequiredSelectionDialog = (gIndex: number) => {
		setCurrentGroupIndex(gIndex)
		setRequirementModalStep(1)
		setTempMinSelection('1')
		setTempMaxSelection('')
		setRequirementModalVisible(true)
	}

	const showMaxSelectionDialog = (gIndex: number) => {
		setCurrentGroupIndex(gIndex)
		setRequirementModalStep(3)
		setTempMaxSelection('')
		setRequirementModalVisible(true)
	}

	const showMaxAmountDialog = (gIndex: number, vIndex: number) => {
		setCurrentGroupIndex(gIndex)
		setCurrentVariationIndex(vIndex)
		setRequirementModalStep(5)
		setTempMaxAmount('')
		setRequirementModalVisible(true)
	}

	const handleMaxAmountConfirm = (allowMultiple: boolean) => {
		if (currentGroupIndex === null || currentVariationIndex === null) return
		
		if (allowMultiple) {
			// Move to step 6 to ask for the max amount
			setRequirementModalStep(6)
		} else {
			// Remove max amount limit (single order only)
			const updated = [...variationGroups]
			updated[currentGroupIndex].variations[currentVariationIndex].max_amount = undefined
			setVariationGroups(updated)
			setRequirementModalVisible(false)
			setCurrentGroupIndex(null)
			setCurrentVariationIndex(null)
			setRequirementModalStep(1)
		}
	}

	const handleMaxAmountValueConfirm = () => {
		if (currentGroupIndex === null || currentVariationIndex === null) return
		
		const numValue = parseInt(tempMaxAmount) || 1
		
		if (numValue < 1) {
			showToast('error', 'Maximum quantity must be at least 1')
			return
		}
		
		if (numValue > 99) {
			showToast('error', 'Maximum quantity cannot exceed 99')
			return
		}
		
		const updated = [...variationGroups]
		updated[currentGroupIndex].variations[currentVariationIndex].max_amount = numValue
		setVariationGroups(updated)
		setRequirementModalVisible(false)
		setCurrentGroupIndex(null)
		setCurrentVariationIndex(null)
		setRequirementModalStep(1)
	}

	const handleRequirementSelection = (require: boolean) => {
		if (currentGroupIndex === null) return
		
		if (require) {
			// Move to step 2 to ask how many are required
			setRequirementModalStep(2)
		} else {
			// Set minimum to 0 when optional
			const updated = [...variationGroups]
			updated[currentGroupIndex].min_selection = 0
			setVariationGroups(updated)
			setRequirementModalVisible(false)
			setCurrentGroupIndex(null)
		}
	}

	const handleMinSelectionConfirm = () => {
		if (currentGroupIndex === null) return
		
		const numValue = parseInt(tempMinSelection) || 1
		const maxSelection = variationGroups[currentGroupIndex].max_selection || 1
		
		if (numValue > maxSelection) {
			showToast('error', `Minimum cannot exceed maximum (${maxSelection})`)
			return
		}
		
		const updated = [...variationGroups]
		updated[currentGroupIndex].min_selection = Math.max(1, numValue)
		setVariationGroups(updated)
		setRequirementModalVisible(false)
		setCurrentGroupIndex(null)
		setRequirementModalStep(1)
	}

	const handleMaxSelectionConfirm = (limit: boolean) => {
		if (currentGroupIndex === null) return
		
		if (limit) {
			// Move to step 4 to ask for the limit amount
			setRequirementModalStep(4)
		} else {
			// Remove max selection limit
			const updated = [...variationGroups]
			updated[currentGroupIndex].max_selection = null
			setVariationGroups(updated)
			setRequirementModalVisible(false)
			setCurrentGroupIndex(null)
			setRequirementModalStep(1)
		}
	}

	const handleMaxSelectionAmountConfirm = () => {
		if (currentGroupIndex === null) return
		
		const numValue = parseInt(tempMaxSelection) || 1
		const minSelection = variationGroups[currentGroupIndex].min_selection || 0
		const numVariations = variationGroups[currentGroupIndex].variations.filter(
			(v) => v.available !== false
		).length
		
		if (numValue < minSelection) {
			showToast('error', `Maximum cannot be less than minimum (${minSelection})`)
			return
		}
		
		if (numValue > numVariations) {
			showToast('error', `Maximum cannot exceed available variations (${numVariations})`)
			return
		}
		
		const updated = [...variationGroups]
		updated[currentGroupIndex].max_selection = numValue
		setVariationGroups(updated)
		setRequirementModalVisible(false)
		setCurrentGroupIndex(null)
		setRequirementModalStep(1)
	}

	useEffect(() => {
		const loadVariationGroups = async () => {
			try {
				setVariationGroupsLoading(true)
				const groupsRes = await api.get(`/item-variation-group/${menuItem.id}`)
				const groups = groupsRes.data.data || []

				const builtGroups: VariationGroup[] = []

				for (const g of groups) {
					const variationsRes = await api.get(
						`/item-variation/group/${g.id}?includeAll=true`
					)
					const createdVariations = variationsRes.data.data || []

					// Convert variation prices from number to string for display and preserve images
					const mappedVariations: Variation[] = createdVariations.map(
						(v: any) => ({
							name: v.variation_name,
							price: v.additional_price?.toString() || '',
							max_amount:
								typeof v.max_amount === 'number' && v.max_amount > 0 ?
									v.max_amount
								:	undefined,
							image_url: v.image_url,
							variation_id: v.id,
							available: v.available !== false,
						})
					)

					builtGroups.push({
						label: g.variation_group_name,
						required_selection: g.required_selection || false,
						min_selection: g.min_selection || 0,
						max_selection: g.max_selection || 1,
						variations: mappedVariations,
					})
				}

				setVariationGroups(builtGroups)
			} catch (err) {
				console.error('Error loading variation groups for edit:', err)
				setVariationGroups([])
			} finally {
				setVariationGroupsLoading(false)
			}
		}

		loadVariationGroups()
	}, [menuItem.id])

	const loadImportSourceItems = async () => {
		try {
			setImportItemsLoading(true)
			const res = await api.get('/menu-item', {
				params: { page: 1, limit: 100 },
			})
			const items = (res.data?.data || res.data || []) as any[]
			const filtered = items.filter((item) => {
				if (item.id === menuItem.id) return false
				const groups = (item as any).variations || []
				return Array.isArray(groups) && groups.length > 0
			})
			setImportSourceItems(filtered)
		} catch (err) {
			console.error('Error loading items for variation import:', err)
			showToast('error', 'Failed to load items to import from.')
		} finally {
			setImportItemsLoading(false)
		}
	}

	const openImportModal = () => {
		setImportModalVisible(true)
		loadImportSourceItems()
	}

	const handleImportFromItem = async (sourceItem: any) => {
		try {
			setImportFromItemLoading(true)
			const groupsFromSource = (sourceItem.variations || []) as any[]
			if (!groupsFromSource.length) {
				showToast('error', 'Selected item has no variations to import.')
				return
			}

			const importedGroups: VariationGroup[] = groupsFromSource.map(
				(g: any) => ({
					label: g.label,
					required_selection: g.required_selection || false,
					min_selection: g.min_selection || 0,
					max_selection: g.max_selection || 1,
					variations: (g.variations || []).map((v: any) => ({
						name: v.name,
						price: v.price != null ? String(v.price) : '',
						max_amount:
							typeof v.max_amount === 'number' && v.max_amount > 0 ?
								v.max_amount
							:	undefined,
						image_url: v.image_url,
						variation_id: v.variation_id,
						available: v.available !== false,
					})),
				})
			)

			setVariationGroups((prev) => [...prev, ...importedGroups])
			showToast('success', 'Variations imported from selected item.')
			setImportModalVisible(false)
		} catch (err) {
			console.error('Error importing variation groups:', err)
			showToast('error', 'Failed to import variations. Please try again.')
		} finally {
			setImportFromItemLoading(false)
		}
	}

	// Load existing categories for this concessionaire (same as AddMenu)
	useEffect(() => {
		const loadCategories = async () => {
			try {
				const res = await api.get('/menu-item', {
					params: { page: 1, limit: 100 },
				})
				const items = (res.data?.data || res.data || []) as any[]
				const setCat = new Set<string>()
				for (const item of items) {
					const cat = item?.category
					if (cat && typeof cat === 'string' && cat.trim()) {
						setCat.add(cat.trim())
					}
				}
				setExistingCategories(
					Array.from(setCat).sort((a, b) => a.localeCompare(b))
				)
			} catch (err) {
				console.error(
					'Error loading categories for concessionaire (edit):',
					err
				)
			}
		}
		loadCategories()
	}, [])

	const pickImage = async () => {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			quality: 0.8,
		})
		if (!result.canceled) setImage(result.assets[0])
	}

	const pickVariationImage = async (gIndex: number, vIndex: number) => {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			quality: 0.8,
		})
		if (!result.canceled) {
			const updated = [...variationGroups]
			updated[gIndex].variations[vIndex].image = result.assets[0]
			updated[gIndex].variations[vIndex].image_url = result.assets[0].uri
			setVariationGroups(updated)
		}
	}

	const addVariationGroup = () =>
		setVariationGroups([
			...variationGroups,
			{
				label: '',
				variations: [],
				required_selection: false,
				min_selection: 0,
				max_selection: 1,
			},
		])

	const removeVariationGroup = (i: number) => {
		const updated = [...variationGroups]
		updated.splice(i, 1)
		setVariationGroups(updated)
	}

	const addVariation = (gIndex: number) => {
		const updated = [...variationGroups]
		const group = updated[gIndex]
		const prevAvailable = group.variations.filter(
			(v) => v.available !== false
		).length

		// New variations default to available
		group.variations.push({ name: '', price: '' })

		const nextAvailable = prevAvailable + 1
		if (group.max_selection === prevAvailable) {
			group.max_selection = nextAvailable
			if (group.min_selection > group.max_selection) {
				group.min_selection = group.max_selection
			}
		}

		setVariationGroups(updated)
	}

	const removeVariation = (gIndex: number, vIndex: number) => {
		const updated = [...variationGroups]
		const group = updated[gIndex]
		const prevAvailable = group.variations.filter(
			(v) => v.available !== false
		).length
		const removed = group.variations[vIndex]
		group.variations.splice(vIndex, 1)
		const removedWasAvailable = removed?.available !== false
		const nextAvailable =
			removedWasAvailable ? prevAvailable - 1 : prevAvailable

		if (group.max_selection === prevAvailable) {
			group.max_selection = nextAvailable
			if (group.min_selection > group.max_selection) {
				group.min_selection = group.max_selection
			}
		}

		setVariationGroups(updated)
	}

	const updateGroupLabel = (index: number, value: string) => {
		const updated = [...variationGroups]
		updated[index].label = value
		setVariationGroups(updated)
	}

	const updateMinSelection = (index: number, value: string) => {
		const updated = [...variationGroups]
		const numValue = parseInt(value) || 0
		const maxSelection = updated[index].max_selection || 1
		const minAllowed = 0

		// Limit min_selection to be <= max_selection and >= minAllowed
		if (numValue > maxSelection) {
			showToast(
				'error',
				`Min selection cannot exceed max selection (${maxSelection})`
			)
			updated[index].min_selection = maxSelection
		} else if (numValue < minAllowed) {
			showToast(
				'error',
				`Min selection must be at least ${minAllowed} when required selection is enabled`
			)
			updated[index].min_selection = minAllowed
		} else {
			updated[index].min_selection = numValue
		}
		setVariationGroups(updated)
	}

	const incrementMinSelection = (index: number) => {
		const updated = [...variationGroups]
		const currentValue = updated[index].min_selection || 0
		const maxSelection = updated[index].max_selection || 1
		const minAllowed = 0

		if (currentValue < maxSelection) {
			updated[index].min_selection = Math.max(currentValue + 1, minAllowed)
			setVariationGroups(updated)
		} else {
			showToast(
				'error',
				`Min selection cannot exceed max selection (${maxSelection})`
			)
		}
	}

	const decrementMinSelection = (index: number) => {
		const updated = [...variationGroups]
		const currentValue = updated[index].min_selection || 0
		const minAllowed = 0

		if (currentValue > minAllowed) {
			updated[index].min_selection = currentValue - 1
			setVariationGroups(updated)
		} else {
			updated[index].min_selection = minAllowed
			setVariationGroups(updated)
		}
	}

	const updateMaxSelection = (index: number, value: string) => {
		const updated = [...variationGroups]
		const numValue = parseInt(value) || 1
		const numVariations = updated[index].variations.filter(
			(v) => v.available !== false
		).length
		const maxAllowed = numVariations > 0 ? numVariations : 1
		const minSelection = updated[index].min_selection || 0

		// Limit max_selection to number of available variations
		if (numValue > maxAllowed) {
			showToast(
				'error',
				`Max selection cannot exceed the number of available variations (${numVariations})`
			)
			updated[index].max_selection = maxAllowed
		} else if (numValue < minSelection) {
			showToast(
				'error',
				`Max selection cannot be less than min selection (${minSelection})`
			)
			updated[index].max_selection = minSelection
		} else {
			updated[index].max_selection = numValue > 0 ? numValue : 1
		}
		setVariationGroups(updated)
	}

	const incrementMaxSelection = (index: number) => {
		const updated = [...variationGroups]
		const currentValue = updated[index].max_selection || 1
		const numVariations = updated[index].variations.filter(
			(v) => v.available !== false
		).length
		const maxAllowed = numVariations > 0 ? numVariations : 1

		if (currentValue < maxAllowed) {
			updated[index].max_selection = currentValue + 1
			setVariationGroups(updated)
		} else {
			showToast(
				'error',
				`Max selection cannot exceed the number of available variations (${numVariations})`
			)
		}
	}

	const decrementMaxSelection = (index: number) => {
		const updated = [...variationGroups]
		const currentValue = updated[index].max_selection || 1
		const minSelection = updated[index].min_selection || 0

		if (currentValue > minSelection) {
			updated[index].max_selection = currentValue - 1
			setVariationGroups(updated)
		} else {
			showToast(
				'error',
				`Max selection cannot be less than min selection (${minSelection})`
			)
		}
	}

	const updateVariation = (
		gIndex: number,
		vIndex: number,
		key: 'name' | 'price' | 'max_amount',
		value: string | number
	) => {
		const updated = [...variationGroups]
		if (key === 'max_amount') {
			if (typeof value === 'number') {
				updated[gIndex].variations[vIndex][key] = value > 0 ? value : undefined
			} else {
				const trimmed = (value as string).trim()
				if (!trimmed) {
					updated[gIndex].variations[vIndex][key] = undefined
				} else {
					const parsed = parseInt(trimmed, 10)
					updated[gIndex].variations[vIndex][key] =
						parsed > 0 ? parsed : undefined
				}
			}
		} else {
			updated[gIndex].variations[vIndex][key] = value as string
		}
		setVariationGroups(updated)
	}

	const toggleGroupOption = (gIndex: number, key: 'required_selection') => {
		const updated = [...variationGroups]
		const newValue = !updated[gIndex][key]
		updated[gIndex][key] = newValue

		// If required_selection is enabled, ensure min_selection is at least 1
		if (newValue && updated[gIndex].min_selection < 1) {
			updated[gIndex].min_selection = 1
		}

		setVariationGroups(updated)
	}

	// Validation schema
	const variationGroupSchema = z.object({
		label: z.string().min(1, 'Group label is required'),
		max_selection: z
			.number()
			.int()
			.positive()
			.max(100, 'Max selection must be between 1 and 100')
			.nullable(),
	})

	const handleUpdateMenu = async () => {
		if (!itemName.trim()) {
			showToast('error', 'Please fill in item name.')
			return
		}

		// Validate variation groups
		for (const group of variationGroups) {
			try {
				// Check if variation group has no variations
				if (group.variations.length === 0) {
					showToast(
						'error',
						`Variation group "${group.label}" has no variations. Please add at least one variation or remove the group.`
					)
					return
				}

				const numVariations = group.variations.filter(
					(v) => v.available !== false
				).length
				const maxAllowed = numVariations > 0 ? numVariations : 1

				// Check if max_selection exceeds number of available variations
				if (group.max_selection && group.max_selection > maxAllowed) {
					showToast(
						'error',
						`${group.label}: Max selection (${group.max_selection}) cannot exceed the number of available variations (${numVariations})`
					)
					return
				}

				variationGroupSchema.parse({
					label: group.label,
					max_selection: group.max_selection,
				})
			} catch (err: any) {
				const message = err?.errors?.[0]?.message || 'Validation error'
				showToast('error', message)
				return
			}
		}

		const normalizedPrice = normalizeCurrencyValue(price)
		const normalizedTakeOutFee = normalizeCurrencyValue(takeOutAdditionalFee)

		const formData = new FormData()
		formData.append('item_name', itemName.trim())
		formData.append('price', normalizedPrice)
		formData.append('category', category.trim())
		formData.append('availability', availability ? 'true' : 'false')
		formData.append('take_out_additional_fee', normalizedTakeOutFee)
		formData.append('variations', JSON.stringify(variationGroups))

		if (image?.uri && !image.uri.startsWith('data')) {
			formData.append('image', {
				uri: image.uri,
				type: 'image/jpeg',
				name: `menu-${Date.now()}.jpg`,
			} as any)
		}

		try {
			setLoading(true)
			await api.put(`/menu-item/${menuItem.id}`, formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
			})

			// Upload variation images if any were changed
			await uploadVariationImages()

			showToast('success', 'Menu item updated successfully')
			navigation.goBack()
		} catch (err: unknown) {
			console.error(err)
			showToast('error', 'Failed to update menu item.')
		} finally {
			setLoading(false)
		}
	}

	const uploadVariationImages = async () => {
		try {
			// Get the newly created variation groups from the server
			const groupsRes = await api.get(`/item-variation-group/${menuItem.id}`)
			const createdGroups = groupsRes.data.data

			// Create a map of group labels to group IDs
			const groupMap = new Map()
			createdGroups.forEach((g: any) => {
				groupMap.set(g.variation_group_name, g.id)
			})

			// Upload images for variations that have new images
			for (let gIndex = 0; gIndex < variationGroups.length; gIndex++) {
				const group = variationGroups[gIndex]
				const groupId = groupMap.get(group.label)

				if (!groupId) continue

				// Get variations for this group
				const variationsRes = await api.get(
					`/item-variation/group/${groupId}?includeAll=true`
				)
				const createdVariations = variationsRes.data.data

				// Create a map of variation names to IDs
				const variationMap = new Map()
				createdVariations.forEach((v: any) => {
					variationMap.set(v.variation_name, v.id)
				})

				// Upload images for variations with new images
				for (let vIndex = 0; vIndex < group.variations.length; vIndex++) {
					const variation = group.variations[vIndex]
					if (variation.image && variation.name) {
						const variationId = variationMap.get(variation.name)
						if (variationId) {
							const imageFormData = new FormData()
							imageFormData.append('image', {
								uri: variation.image.uri,
								type: 'image/jpeg',
								name: `variation-${Date.now()}.jpg`,
							} as any)

							await api.put(
								`/item-variation/${variationId}/image`,
								imageFormData,
								{
									headers: { 'Content-Type': 'multipart/form-data' },
								}
							)
						}
					}
				}
			}
		} catch (error) {
			console.error('Error uploading variation images:', error)
			// Don't show error to user as the main menu item was updated successfully
		}
	}

	// Render page indicators
	const renderPageIndicators = () => (
		<View style={styles.pageIndicators}>
			<TouchableOpacity
				style={[styles.pageIndicator, currentPage === 1 && styles.pageIndicatorActive]}
				onPress={() => goToPreviousPage()}
				disabled={currentPage === 1}>
				<Text style={[styles.pageIndicatorText, currentPage === 1 && styles.pageIndicatorTextActive]}>1</Text>
			</TouchableOpacity>
			<View style={styles.pageConnector} />
			<TouchableOpacity
				style={[styles.pageIndicator, currentPage === 2 && styles.pageIndicatorActive]}
				onPress={() => goToNextPage()}
				disabled={currentPage === 2}>
				<Text style={[styles.pageIndicatorText, currentPage === 2 && styles.pageIndicatorTextActive]}>2</Text>
			</TouchableOpacity>
		</View>
	)

	// Render general details page
	const renderGeneralDetails = () => (
		<View style={styles.sectionCard}>
			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>General Details</Text>
				<Text style={styles.sectionHint}>* Required</Text>
			</View>

			<Text style={styles.label}>
				Item Name <Text style={styles.required}>*</Text>
			</Text>
			<TextInput
				style={styles.input}
				value={itemName}
				onChangeText={setItemName}
				placeholder="Enter menu item name"
			/>

			<Text style={styles.label}>
				Base Price <Text style={styles.required}>*</Text>
			</Text>
			<View style={styles.currencyInputWrapper}>
				<Text style={styles.currencyPrefix}>₱</Text>
				<TextInput
					style={styles.currencyInput}
					value={price}
					keyboardType="numeric"
					onChangeText={handlePriceChange}
					onBlur={ensurePriceFallback}
					placeholder="0.00"
				/>
			</View>
			<Text style={styles.helperText}>
				Leaving this blank automatically sets the price to ₱0.00.
			</Text>

			<Text style={styles.label}>
				Take Out Additional Fee
			</Text>
			<View style={styles.currencyInputWrapper}>
				<Text style={styles.currencyPrefix}>₱</Text>
				<TextInput
					style={styles.currencyInput}
					value={takeOutAdditionalFee}
					keyboardType="numeric"
					onChangeText={handleTakeOutFeeChange}
					onBlur={ensureTakeOutFeeFallback}
					placeholder="0.00"
				/>
			</View>
			<Text style={styles.helperText}>
				Additional fee for take-out orders (optional).
			</Text>

			<Text style={styles.label}>Image</Text>
			<TouchableOpacity
				style={styles.imagePicker}
				onPress={pickImage}>
				{image ?
					<Image
						source={{ uri: image.uri }}
						style={styles.previewImage}
					/>
				: <Text style={{ color: '#555' }}>Pick an image</Text>}
			</TouchableOpacity>

			<Text style={styles.label}>Category</Text>
			<TextInput
				style={styles.input}
				placeholder="e.g. Beverage, Snack, Meal..."
				value={category}
				onChangeText={setCategory}
			/>
			{existingCategories.length > 0 && (
				<View style={styles.categoryChipsContainer}>
					{existingCategories.map((cat) => (
						<TouchableOpacity
							key={cat}
							style={[
								styles.categoryChip,
								category === cat && styles.categoryChipSelected,
							]}
							onPress={() => setCategory(cat)}>
							<Text
								style={[
									styles.categoryChipText,
									category === cat && styles.categoryChipTextSelected,
								]}>
								{cat}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			)}

			<View style={[styles.labelRow, { marginTop: 18 }]}>
				<Text style={styles.label}>Availability</Text>
			</View>
			<View style={styles.toggleRow}>
				<Switch
					value={availability}
					onValueChange={setAvailability}
					trackColor={{ false: '#ccc', true: '#A40C2D' }}
					thumbColor="#fff"
				/>
				<Text style={styles.helperText}>
					Toggle off to temporarily hide this menu item.
				</Text>
			</View>
		</View>
	)

	// Render variations page
	const renderVariations = () => (
		<View style={styles.sectionCard}>
			<View style={styles.labelRow}>
				<Text style={styles.sectionTitle}>Variations</Text>
				<TouchableOpacity
					style={styles.importButton}
					onPress={openImportModal}
					disabled={variationGroupsLoading}>
					<Text style={styles.importButtonText}>Import from item</Text>
				</TouchableOpacity>
			</View>
			<Text style={[styles.helperText, { marginBottom: 12 }]}>
				Optional: Add variation groups for sizes, add-ons, or combos.
			</Text>

			{variationGroupsLoading && variationGroups.length === 0 ?
				<View style={styles.variationLoadingRow}>
					<ActivityIndicator
						size="small"
						color="#A40C2D"
					/>
					<Text style={styles.variationLoadingText}>Loading options...</Text>
				</View>
			: null}

			{variationGroups.map((group, gIndex) => (
				<View
					key={gIndex}
					style={styles.groupBox}>
					<TextInput
						style={styles.input}
						placeholder="Group label (e.g. Size)"
						value={group.label}
						onChangeText={(t) => updateGroupLabel(gIndex, t)}
					/>

					{/* Selection Requirements */}
					<View style={styles.selectionRequirementsContainer}>
						<Text style={styles.label}>Selection Requirements</Text>
						<TouchableOpacity
							style={styles.requirementButton}
							onPress={() => showRequiredSelectionDialog(gIndex)}>
							<Text style={styles.requirementButtonText}>
								{group.min_selection > 0 ?
									`Required: Select at least ${group.min_selection}`
								: 'Optional: Customers can skip this group'}
							</Text>
						</TouchableOpacity>
					</View>

					{/* Max Selection */}
					<View style={styles.selectionRequirementsContainer}>
						<Text style={styles.label}>Max Selection</Text>
						<TouchableOpacity
							style={styles.requirementButton}
							onPress={() => showMaxSelectionDialog(gIndex)}>
							<Text style={styles.requirementButtonText}>
								{group.max_selection ?
									`Maximum: ${group.max_selection} variation(s)`
								: 'No limit: Customers can select all variations'}
							</Text>
						</TouchableOpacity>
					</View>

					{/* Variations */}
					{group.variations.map((v, vIndex) => (
						<View
							key={vIndex}
							style={styles.variationCard}>
							<TouchableOpacity
								style={styles.removeVariationIcon}
								onPress={() => removeVariation(gIndex, vIndex)}>
								<Text style={styles.removeVariationButtonText}>✕</Text>
							</TouchableOpacity>

							<View style={styles.variationColumn}>
								{/* Image row */}
								<View style={styles.variationImageRow}>
									<TouchableOpacity
										style={styles.variationImageButton}
										onPress={() => pickVariationImage(gIndex, vIndex)}>
										{v.image || v.image_url ?
											<Image
												source={{ uri: v.image?.uri || v.image_url }}
												style={styles.variationImagePreview}
											/>
										: <View style={styles.variationImagePlaceholder}>
												<Text style={styles.variationImagePlaceholderText}>
													📷
												</Text>
											</View>
										}
									</TouchableOpacity>
								</View>

								{/* Separator line */}
								<View style={styles.variationSeparator} />

								{/* Input fields row */}
								<View style={styles.variationFields}>
									<View style={styles.variationRowLine}>
										<View style={styles.fieldColWide}>
											<Text style={styles.smallLabel}>Name</Text>
											<TextInput
												style={[styles.input, styles.variationNameInput]}
												placeholder="Name"
												value={v.name}
												onChangeText={(t) =>
													updateVariation(gIndex, vIndex, 'name', t)
												}
											/>
										</View>
										<View style={styles.fieldColNarrow}>
											<Text style={styles.smallLabel}>Price</Text>
											<TextInput
												style={[
													styles.input,
													styles.variationPriceInput,
													{ width: 110 },
												]}
												placeholder="Price"
												keyboardType="numeric"
												value={v.price}
												onChangeText={(t) =>
													updateVariation(gIndex, vIndex, 'price', t)
												}
											/>
										</View>
									</View>

									<View style={styles.variationRowLine}>
										<View style={[styles.availableRow, { flex: 1 }]}>
											<Text style={styles.smallLabel}>Available</Text>
											<Switch
												value={v.available !== false}
												onValueChange={(val) => {
													const updated = [...variationGroups]
													const group = updated[gIndex]

													const prevAvailable = group.variations.filter(
														(v2) => v2.available !== false
													).length

													group.variations[vIndex].available = val

													const nextAvailable = group.variations.filter(
														(v2) => v2.available !== false
													).length

													if (group.max_selection === prevAvailable) {
														group.max_selection = nextAvailable
														if (group.min_selection > group.max_selection) {
															group.min_selection = group.max_selection
														}
													}

													setVariationGroups(updated)
												}}
												trackColor={{ false: '#ccc', true: '#A40C2D' }}
												thumbColor="#fff"
											/>
										</View>
										<View style={styles.fieldColTiny}>
											<Text style={styles.smallLabel}>Max Quantity</Text>
											<TouchableOpacity
												style={styles.requirementButton}
												onPress={() => showMaxAmountDialog(gIndex, vIndex)}>
												<Text style={styles.requirementButtonText}>
													{v.max_amount ?
														`Max: ${v.max_amount} order(s)`
													: 'Single order only'}
												</Text>
											</TouchableOpacity>
										</View>
									</View>
								</View>
							</View>
						</View>
					))}

					<View
						style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
						<TouchableOpacity
							style={styles.smallButton}
							onPress={() => addVariation(gIndex)}>
							<Text style={styles.smallButtonText}>+ Add Variation</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.removeGroupButton}
							onPress={() => removeVariationGroup(gIndex)}>
							<Text style={styles.removeGroupButtonText}>Remove Group</Text>
						</TouchableOpacity>
					</View>
				</View>
			))}

			<TouchableOpacity
				style={styles.buttonOutline}
				onPress={addVariationGroup}>
				<Text style={styles.buttonOutlineText}>+ Add Variation Group</Text>
			</TouchableOpacity>
		</View>
	)

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={{ paddingBottom: 120 }}>
			
			{/* Page Indicators */}
			{renderPageIndicators()}

			{/* Page Content */}
			{currentPage === 1 ? renderGeneralDetails() : renderVariations()}

			{/* Navigation Buttons */}
			<View style={styles.navigationButtons}>
				{currentPage > 1 && (
					<TouchableOpacity
						style={[styles.buttonOutline, styles.secondaryButton]}
						onPress={goToPreviousPage}
						disabled={loading}>
						<Text style={styles.buttonOutlineText}>Previous</Text>
					</TouchableOpacity>
				)}
				
				{currentPage < 2 ? (
					<TouchableOpacity
						style={[styles.button, styles.primaryButton]}
						onPress={goToNextPage}
						disabled={loading}>
						<Text style={styles.buttonText}>Next: Variations</Text>
					</TouchableOpacity>
				) : (
					<TouchableOpacity
						style={[styles.button, styles.primaryButton]}
						onPress={handleUpdateMenu}
						disabled={loading}>
						<Text style={styles.buttonText}>
							{loading ? 'Saving...' : 'Save Changes'}
						</Text>
					</TouchableOpacity>
				)}
			</View>

			{importModalVisible && (
				<Modal
					visible={importModalVisible}
					transparent
					animationType="slide"
					onRequestClose={() => {
						if (!importFromItemLoading) setImportModalVisible(false)
					}}>
					<TouchableOpacity
						style={styles.modalBackdrop}
						activeOpacity={1}
						onPress={() => {
							if (!importFromItemLoading) setImportModalVisible(false)
						}}>
						<TouchableOpacity
							activeOpacity={1}
							style={styles.modalSheet}
							onPress={() => {}}>
							<Text style={styles.modalTitle}>Import variations</Text>
							<Text style={styles.modalSubtitle}>
								Choose an existing menu item to copy its variation groups.
							</Text>

							{importItemsLoading ?
								<View style={styles.modalLoadingRow}>
									<ActivityIndicator
										size="small"
										color="#A40C2D"
									/>
									<Text style={styles.modalLoadingText}>Loading items...</Text>
								</View>
							: importSourceItems.length === 0 ?
								<Text style={styles.modalEmptyText}>
									No other items with variations found.
								</Text>
							:	importSourceItems.map((item) => (
									<TouchableOpacity
										key={item.id}
										style={styles.modalOption}
										onPress={() => handleImportFromItem(item)}
										disabled={importFromItemLoading}>
										<Text style={styles.modalOptionText}>{item.item_name}</Text>
										{item.category ?
											<Text style={styles.modalOptionMeta}>
												{item.category}
											</Text>
										:	null}
									</TouchableOpacity>
								))
							}

							{importFromItemLoading ?
								<Text style={styles.modalImportHint}>
									Importing variations...
								</Text>
							:	null}
						</TouchableOpacity>
					</TouchableOpacity>
				</Modal>
			)}

			{/* Selection Requirements Modal */}
			{requirementModalVisible && (
				<Modal
					visible={requirementModalVisible}
					transparent
					animationType="fade"
					onRequestClose={() => {
						setRequirementModalVisible(false)
						setRequirementModalStep(1)
						setCurrentGroupIndex(null)
						setCurrentVariationIndex(null)
					}}>
					<TouchableOpacity
						style={styles.modalBackdrop}
						activeOpacity={1}
						onPress={() => {
							setRequirementModalVisible(false)
							setRequirementModalStep(1)
							setCurrentGroupIndex(null)
							setCurrentVariationIndex(null)
						}}>
						<TouchableOpacity
							style={styles.requirementModalSheet}
							activeOpacity={1}
							onPress={(e) => e.stopPropagation()}>
							{requirementModalStep === 1 ? (
								<>
									<Text style={styles.modalTitle}>Require Selection</Text>
									<Text style={styles.modalSubtitle}>
										Do you want to require customers to select at least one of the variations in this group?
									</Text>
									
									<View style={styles.requirementModalButtons}>
										<TouchableOpacity
											style={[styles.requirementModalButton, styles.requirementModalButtonNo]}
											onPress={() => handleRequirementSelection(false)}>
											<Text style={styles.requirementModalButtonTextNo}>No, Optional</Text>
										</TouchableOpacity>
										<TouchableOpacity
											style={[styles.requirementModalButton, styles.requirementModalButtonYes]}
											onPress={() => handleRequirementSelection(true)}>
											<Text style={styles.requirementModalButtonTextYes}>Yes, Required</Text>
										</TouchableOpacity>
									</View>
								</>
							) : requirementModalStep === 2 ? (
								<>
									<Text style={styles.modalTitle}>How Many Required?</Text>
									<Text style={styles.modalSubtitle}>
										How many variations must customers select at minimum?
									</Text>
									
									<View style={styles.requirementInputContainer}>
										<Text style={styles.requirementInputLabel}>Minimum Selection</Text>
										<TextInput
											style={styles.requirementInput}
											keyboardType="numeric"
											value={tempMinSelection}
											onChangeText={setTempMinSelection}
											placeholder="1"
										/>
									</View>
									
									<View style={styles.requirementModalButtons}>
										<TouchableOpacity
											style={[styles.requirementModalButton, styles.requirementModalButtonBack]}
											onPress={() => setRequirementModalStep(1)}>
											<Text style={styles.requirementModalButtonTextBack}>Back</Text>
										</TouchableOpacity>
										<TouchableOpacity
											style={[styles.requirementModalButton, styles.requirementModalButtonConfirm]}
											onPress={handleMinSelectionConfirm}>
											<Text style={styles.requirementModalButtonTextConfirm}>Confirm</Text>
										</TouchableOpacity>
									</View>
								</>
							) : requirementModalStep === 3 ? (
								<>
									<Text style={styles.modalTitle}>Limit Maximum Selection</Text>
									<Text style={styles.modalSubtitle}>
										Do you want to limit how many variations customers can select from this group?
									</Text>
									
									<View style={styles.requirementModalButtons}>
										<TouchableOpacity
											style={[styles.requirementModalButton, styles.requirementModalButtonNo]}
											onPress={() => handleMaxSelectionConfirm(false)}>
											<Text style={styles.requirementModalButtonTextNo}>No Limit</Text>
										</TouchableOpacity>
										<TouchableOpacity
											style={[styles.requirementModalButton, styles.requirementModalButtonYes]}
											onPress={() => handleMaxSelectionConfirm(true)}>
											<Text style={styles.requirementModalButtonTextYes}>Set Limit</Text>
										</TouchableOpacity>
									</View>
								</>
							) : requirementModalStep === 4 ? (
								<>
									<Text style={styles.modalTitle}>Maximum Selection</Text>
									<Text style={styles.modalSubtitle}>
										What is the maximum number of variations customers can select?
									</Text>
									
									<View style={styles.requirementInputContainer}>
										<Text style={styles.requirementInputLabel}>Maximum Selection</Text>
										<TextInput
											style={styles.requirementInput}
											keyboardType="numeric"
											value={tempMaxSelection}
											onChangeText={setTempMaxSelection}
											placeholder="1"
										/>
									</View>
									
									<View style={styles.requirementModalButtons}>
										<TouchableOpacity
											style={[styles.requirementModalButton, styles.requirementModalButtonBack]}
											onPress={() => setRequirementModalStep(3)}>
											<Text style={styles.requirementModalButtonTextBack}>Back</Text>
										</TouchableOpacity>
										<TouchableOpacity
											style={[styles.requirementModalButton, styles.requirementModalButtonConfirm]}
											onPress={handleMaxSelectionAmountConfirm}>
											<Text style={styles.requirementModalButtonTextConfirm}>Confirm</Text>
										</TouchableOpacity>
									</View>
								</>
							) : requirementModalStep === 5 ? (
								<>
									<Text style={styles.modalTitle}>Allow Multiple Orders</Text>
									<Text style={styles.modalSubtitle}>
										Do you want to allow customers to order this variation multiple times in a single order?
									</Text>
									
									<View style={styles.requirementModalButtons}>
										<TouchableOpacity
											style={[styles.requirementModalButton, styles.requirementModalButtonNo]}
											onPress={() => handleMaxAmountConfirm(false)}>
											<Text style={styles.requirementModalButtonTextNo}>Single Order Only</Text>
										</TouchableOpacity>
										<TouchableOpacity
											style={[styles.requirementModalButton, styles.requirementModalButtonYes]}
											onPress={() => handleMaxAmountConfirm(true)}>
											<Text style={styles.requirementModalButtonTextYes}>Allow Multiple</Text>
										</TouchableOpacity>
									</View>
								</>
							) : (
								<>
									<Text style={styles.modalTitle}>Maximum Quantity</Text>
									<Text style={styles.modalSubtitle}>
										What is the maximum number of times a customer can order this variation?
									</Text>
									
									<View style={styles.requirementInputContainer}>
										<Text style={styles.requirementInputLabel}>Maximum Quantity</Text>
										<TextInput
											style={styles.requirementInput}
											keyboardType="numeric"
											value={tempMaxAmount}
											onChangeText={setTempMaxAmount}
											placeholder="3"
										/>
									</View>
									
									<View style={styles.requirementModalButtons}>
										<TouchableOpacity
											style={[styles.requirementModalButton, styles.requirementModalButtonBack]}
											onPress={() => setRequirementModalStep(5)}>
											<Text style={styles.requirementModalButtonTextBack}>Back</Text>
										</TouchableOpacity>
										<TouchableOpacity
											style={[styles.requirementModalButton, styles.requirementModalButtonConfirm]}
											onPress={handleMaxAmountValueConfirm}>
											<Text style={styles.requirementModalButtonTextConfirm}>Confirm</Text>
										</TouchableOpacity>
									</View>
								</>
							)}
							
							<Text style={styles.requirementModalHelper}>
								{requirementModalStep === 1 ?
									(currentGroupIndex !== null && variationGroups[currentGroupIndex]?.min_selection > 0 ?
										"Currently required: customers must select at least " + variationGroups[currentGroupIndex].min_selection + " variation(s)"
									: "Currently optional: customers can skip this variation group")
								: requirementModalStep === 2 ?
									`Maximum allowed: ${currentGroupIndex !== null ? (variationGroups[currentGroupIndex]?.max_selection || variationGroups[currentGroupIndex]?.variations.filter((v) => v.available !== false).length || 1) : 1} variation(s)`
								: requirementModalStep === 3 ?
									(currentGroupIndex !== null && variationGroups[currentGroupIndex]?.max_selection ?
										`Currently limited: customers can select up to ${variationGroups[currentGroupIndex].max_selection} variation(s)`
									: "Currently unlimited: customers can select all variations")
								: requirementModalStep === 4 ?
									`Minimum required: ${currentGroupIndex !== null ? (variationGroups[currentGroupIndex]?.min_selection || 0) : 0} variation(s)`
								: requirementModalStep === 5 ?
									(currentGroupIndex !== null && currentVariationIndex !== null && variationGroups[currentGroupIndex]?.variations[currentVariationIndex]?.max_amount ?
										`Currently limited: customers can order up to ${variationGroups[currentGroupIndex].variations[currentVariationIndex].max_amount} time(s)`
									: "Currently single order: customers can only order this once")
								: `Example: Rice can be ordered multiple times, while special items may be limited`
								}
							</Text>
						</TouchableOpacity>
					</TouchableOpacity>
				</Modal>
			)}
		</ScrollView>
	)
}

export default EditMenu

const styles = StyleSheet.create({
	container: { flex: 1, padding: 16, backgroundColor: '#fff' },
	label: { marginTop: 12, fontSize: 14, fontWeight: '600' },
	labelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	infoIcon: { fontSize: 16, color: '#555' },
	tooltipBox: {
		backgroundColor: '#333',
		padding: 8,
		borderRadius: 6,
		marginTop: 4,
		marginBottom: 6,
		maxWidth: '90%',
	},
	tooltipText: { fontSize: 12, color: '#fff' },
	input: {
		borderWidth: 1,
		borderColor: '#ccc',
		padding: 10,
		borderRadius: 8,
		marginTop: 6,
		backgroundColor: '#fff',
	},
	sectionCard: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#eee',
		shadowColor: '#000',
		shadowOpacity: 0.03,
		shadowOffset: { width: 0, height: 1 },
		shadowRadius: 3,
		elevation: 1,
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '600',
	},
	sectionHint: {
		fontSize: 12,
		color: '#888',
	},
	required: {
		color: '#A40C2D',
	},
	currencyInputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 10,
		paddingHorizontal: 10,
		marginTop: 6,
		backgroundColor: '#fff',
	},
	currencyPrefix: {
		fontSize: 16,
		marginRight: 4,
	},
	currencyInput: {
		flex: 1,
		paddingVertical: 10,
		fontSize: 16,
	},
	helperText: {
		fontSize: 12,
		color: '#666',
		marginTop: 4,
	},
	importButton: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#A40C2D',
	},
	importButtonText: {
		fontSize: 12,
		color: '#A40C2D',
		fontWeight: '600',
	},
	imagePicker: {
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 8,
		padding: 12,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 6,
	},
	previewImage: { width: 120, height: 120, borderRadius: 10 },
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 8,
	},
	variationLoadingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 8,
		gap: 8,
	},
	variationLoadingText: {
		fontSize: 12,
		color: '#666',
	},
	groupBox: {
		borderWidth: 1,
		borderColor: '#aaa',
		borderRadius: 8,
		padding: 10,
		marginTop: 12,
		backgroundColor: '#f9f9f9',
	},
	variationCard: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 10,
		padding: 10,
		marginTop: 8,
		backgroundColor: '#fff',
		position: 'relative',
	},
	variationColumn: {
		gap: 12,
	},
	variationImageRow: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingBottom: 12,
	},
	variationImageButton: {
		width: 60,
		height: 60,
		borderRadius: 8,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: '#ddd',
	},
	variationImagePreview: {
		width: '100%',
		height: '100%',
	},
	variationImagePlaceholder: {
		width: '100%',
		height: '100%',
		backgroundColor: '#f0f0f0',
		justifyContent: 'center',
		alignItems: 'center',
	},
	variationImagePlaceholderText: {
		fontSize: 20,
	},
	variationSeparator: {
		height: 1,
		backgroundColor: '#e0e0e0',
		marginHorizontal: 0,
		marginBottom: 12,
	},
	removeVariationIcon: {
		position: 'absolute',
		top: 6,
		right: 6,
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#ffefef',
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 2,
	},
	variationFields: {
		gap: 8,
	},
	variationRowLine: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		flex: 1,
	},
	availableRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		flex: 1,
	},
	fieldColWide: {
		flex: 1,
	},
	fieldColNarrow: {
		width: 120,
	},
	fieldColTiny: {
		width: 120,
	},
	variationHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 8,
		marginBottom: 4,
		gap: 6,
		paddingHorizontal: 4,
	},
	headerText: {
		fontSize: 12,
		color: '#666',
	},
	smallLabel: {
		fontSize: 12,
		color: '#666',
		marginBottom: 4,
	},
	variationNameInput: {
		flex: 3,
		marginTop: 0,
	},
	variationPriceInput: {
		flex: 1,
		marginTop: 0,
	},
	variationMaxAmountInput: {
		width: 110,
		marginTop: 0,
	},
	fieldRow: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginLeft: 8,
	},
	removeVariationButton: {
		width: 40,
		height: 40,
		backgroundColor: '#ffdddd',
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	removeVariationButtonText: {
		color: 'darkred',
		fontSize: 20,
		fontWeight: 'bold',
	},
	maxSelectionContainer: {
		marginTop: 8,
	},
	maxSelectionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
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
	selectionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginTop: 8,
	},
	selectionLabelContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		minWidth: 120,
	},
	selectionInput: {
		width: 80,
		borderWidth: 1,
		borderColor: '#ccc',
		padding: 10,
		borderRadius: 8,
		textAlign: 'center',
		fontSize: 16,
		backgroundColor: '#fff',
	},
	maxSelectionButton: {
		width: 40,
		height: 40,
		backgroundColor: '#A40C2D',
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	maxSelectionButtonText: {
		color: '#fff',
		fontSize: 24,
		fontWeight: 'bold',
	},
	toggleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	variationRightCol: {
		flex: 1,
		marginLeft: 8,
		gap: 6,
	},
	toggleLabel: {
		fontSize: 14,
	},
	maxSelectionHint: {
		fontSize: 12,
		color: '#666',
		marginTop: 4,
		marginLeft: 8,
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	// Styles for requirement modal
	requirementModalSheet: {
		backgroundColor: '#fff',
		paddingHorizontal: 24,
		paddingTop: 20,
		paddingBottom: 24,
		borderRadius: 16,
		minWidth: 320,
		maxWidth: 400,
		alignSelf: 'center',
	},
	requirementModalButtons: {
		flexDirection: 'row',
		gap: 12,
		marginTop: 20,
	},
	requirementModalButton: {
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	requirementModalButtonNo: {
		borderWidth: 1,
		borderColor: '#ddd',
		backgroundColor: '#f8f8f8',
	},
	requirementModalButtonYes: {
		backgroundColor: '#A40C2D',
	},
	requirementModalButtonBack: {
		borderWidth: 1,
		borderColor: '#ddd',
		backgroundColor: '#f8f8f8',
	},
	requirementModalButtonConfirm: {
		backgroundColor: '#A40C2D',
	},
	requirementModalButtonTextNo: {
		fontSize: 14,
		fontWeight: '600',
		color: '#666',
	},
	requirementModalButtonTextYes: {
		fontSize: 14,
		fontWeight: '600',
		color: '#fff',
	},
	requirementModalButtonTextBack: {
		fontSize: 14,
		fontWeight: '600',
		color: '#666',
	},
	requirementModalButtonTextConfirm: {
		fontSize: 14,
		fontWeight: '600',
		color: '#fff',
	},
	requirementModalHelper: {
		fontSize: 12,
		color: '#666',
		textAlign: 'center',
		marginTop: 12,
		lineHeight: 16,
	},
	requirementInputContainer: {
		marginTop: 16,
	},
	requirementInputLabel: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 8,
	},
	requirementInput: {
		borderWidth: 1,
		borderColor: '#ccc',
		padding: 12,
		borderRadius: 8,
		fontSize: 16,
		textAlign: 'center',
		backgroundColor: '#fff',
	},
	// Add missing styles that were accidentally removed
	modalSheet: {
		backgroundColor: '#fff',
		paddingHorizontal: 20,
		paddingTop: 16,
		paddingBottom: 24,
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
	},
	modalTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111',
		marginBottom: 4,
	},
	modalSubtitle: {
		fontSize: 13,
		color: '#555',
		marginBottom: 10,
	},
	modalLoadingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 8,
		gap: 8,
	},
	modalLoadingText: {
		fontSize: 12,
		color: '#666',
	},
	modalOption: {
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: '#eee',
	},
	modalOptionText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#111',
	},
	modalOptionMeta: {
		fontSize: 12,
		color: '#666',
		marginTop: 2,
	},
	modalEmptyText: {
		fontSize: 12,
		color: '#666',
		marginTop: 8,
	},
	modalImportHint: {
		fontSize: 12,
		color: '#A40C2D',
		marginTop: 10,
	},
	categoryChipsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 6,
		gap: 6,
	},
	categoryChip: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#ccc',
		backgroundColor: '#f8f8f8',
	},
	categoryChipSelected: {
		borderColor: 'darkred',
		backgroundColor: '#ffecec',
	},
	categoryChipText: {
		fontSize: 12,
		color: '#555',
	},
	categoryChipTextSelected: {
		color: 'darkred',
		fontWeight: '600',
	},
	removeButton: {
		backgroundColor: '#ffdddd',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 6,
	},
	removeButtonText: { color: 'darkred', fontWeight: 'bold' },
	smallButton: {
		backgroundColor: '#eee',
		padding: 8,
		borderRadius: 6,
		marginTop: 8,
		alignItems: 'center',
	},
	smallButtonText: { color: 'darkred', fontWeight: '600' },
	removeGroupButton: {
		backgroundColor: '#ffeaea',
		padding: 8,
		borderRadius: 6,
		marginTop: 8,
		alignItems: 'center',
	},
	removeGroupButtonText: { color: 'red', fontWeight: '600' },
	buttonOutline: {
		borderWidth: 1,
		borderColor: 'darkred',
		padding: 14,
		borderRadius: 8,
		marginTop: 16,
		alignItems: 'center',
	},
	buttonOutlineText: { color: 'darkred', fontWeight: '600', fontSize: 14 },
	button: {
		backgroundColor: 'darkred',
		padding: 14,
		borderRadius: 8,
		marginTop: 20,
		alignItems: 'center',
	},
	buttonText: { color: 'white', fontWeight: '600', fontSize: 16 },
	// New styles for multi-page form
	pageIndicators: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 20,
		gap: 8,
	},
	pageIndicator: {
		width: 32,
		height: 32,
		borderRadius: 16,
		borderWidth: 2,
		borderColor: '#ccc',
		backgroundColor: '#f8f8f8',
		justifyContent: 'center',
		alignItems: 'center',
	},
	pageIndicatorActive: {
		borderColor: '#A40C2D',
		backgroundColor: '#A40C2D',
	},
	pageIndicatorText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#666',
	},
	pageIndicatorTextActive: {
		color: '#fff',
	},
	pageConnector: {
		width: 40,
		height: 2,
		backgroundColor: '#ccc',
	},
	navigationButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
		marginTop: 20,
	},
	primaryButton: {
		flex: 1,
	},
	secondaryButton: {
		flex: 1,
	},
	selectionRequirementsContainer: {
		marginTop: 12,
		marginBottom: 8,
	},
	requirementButton: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 12,
		backgroundColor: '#f9f9f9',
		marginTop: 6,
	},
	requirementButtonText: {
		fontSize: 14,
		color: '#333',
		fontWeight: '500',
	},
	selectionHelper: {
		fontSize: 12,
		color: '#666',
		marginTop: 2,
	},
})
