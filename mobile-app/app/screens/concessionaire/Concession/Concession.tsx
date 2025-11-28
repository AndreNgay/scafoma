import React, { useEffect, useState } from 'react'
import {
	View,
	Text,
	StyleSheet,
	Image,
	ActivityIndicator,
	Switch,
	ScrollView,
	TextInput,
	Button,
	TouchableOpacity,
	Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
import api from '../../../libs/apiCall'
import { z } from 'zod'
import { useToast } from '../../../contexts/ToastContext'

type Concession = {
	id: number
	concession_name: string
	image_url?: string
	cafeteria_name: string
	location: string
	gcash_payment_available: boolean
	oncounter_payment_available: boolean
	gcash_number?: string
	receipt_timer?: string
	status: 'open' | 'closed'
}

const concessionSchema = z
	.object({
		concession_name: z
			.string()
			.min(2, 'Concession name must be at least 2 characters'),
		gcash_payment_available: z.boolean(),
		gcash_number: z.string().optional().or(z.literal('')),
		receipt_timer: z.string().optional().or(z.literal('')),
	})
	.refine(
		(data) =>
			!data.gcash_payment_available ||
			(data.gcash_number && /^[0-9]{11}$/.test(data.gcash_number)),
		{
			message: 'GCash number must be 11 digits.',
			path: ['gcash_number'],
		}
	)
	.refine(
		(data) =>
			!data.receipt_timer ||
			/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(data.receipt_timer),
		{
			message: 'Receipt timer must be in HH:MM:SS format (e.g., 00:15:00).',
			path: ['receipt_timer'],
		}
	)

const Concession = () => {
	const [concession, setConcession] = useState<Concession | null>(null)
	const [original, setOriginal] = useState<Concession | null>(null)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [imageAsset, setImageAsset] = useState<any>(null)
	const [imageIsNew, setImageIsNew] = useState(false)
	const [showTimePicker, setShowTimePicker] = useState(false)
	const { showToast } = useToast()

	const fetchConcession = async () => {
		try {
			const res = await api.get('/concession')
			setConcession(res.data.data)
			setOriginal(res.data.data)
		} catch (error) {
			console.error('Error fetching concession:', error)
		} finally {
			setLoading(false)
		}
	}

	const pickImage = async () => {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			quality: 0.7,
		})

		if (!result.canceled) {
			setImageAsset(result.assets[0])
			setImageIsNew(true)
		}
	}

	const handleTimeChange = (event: any, selectedDate?: Date) => {
		if (Platform.OS === 'android') {
			setShowTimePicker(false)
		}

		if (event.type === 'set' && selectedDate) {
			const hours = selectedDate.getHours().toString().padStart(2, '0')
			const minutes = selectedDate.getMinutes().toString().padStart(2, '0')
			const seconds = selectedDate.getSeconds().toString().padStart(2, '0')
			const timeString = `${hours}:${minutes}:${seconds}`
			setConcession({ ...concession!, receipt_timer: timeString })
		} else if (event.type === 'dismissed') {
			setShowTimePicker(false)
		}
	}

	const getTimePickerDate = () => {
		if (!concession?.receipt_timer) {
			const date = new Date()
			date.setHours(0, 15, 0)
			return date
		}
		try {
			const [hours, minutes, seconds] = concession.receipt_timer
				.split(':')
				.map(Number)
			const date = new Date()
			date.setHours(hours || 0, minutes || 0, seconds || 0)
			return date
		} catch {
			const date = new Date()
			date.setHours(0, 15, 0)
			return date
		}
	}

	const handleSave = async () => {
		if (!concession) return

		const validation = concessionSchema.safeParse(concession)
		if (!validation.success) {
			const fieldErrors: Record<string, string> = {}
			validation.error.issues.forEach((issue) => {
				if (issue.path[0]) {
					fieldErrors[issue.path[0].toString()] = issue.message
				}
			})
			setErrors(fieldErrors)
			return
		}
		setErrors({})
		setSaving(true)

		try {
			const formData = new FormData()
			formData.append('concession_name', concession.concession_name)
			formData.append(
				'gcash_payment_available',
				String(concession.gcash_payment_available)
			)
			formData.append(
				'oncounter_payment_available',
				String(concession.oncounter_payment_available)
			)
			formData.append('gcash_number', concession.gcash_number || '')
			formData.append('receipt_timer', concession.receipt_timer || '00:15:00')
			formData.append('status', concession.status)

			if (imageIsNew && imageAsset?.uri) {
				formData.append('image', {
					uri: imageAsset.uri,
					type: 'image/jpeg',
					name: `concession-${Date.now()}.jpg`,
				} as any)
			}

			const res = await api.put('/concession/me', formData, {
				headers: {
					Accept: 'application/json',
					'Content-Type': 'multipart/form-data',
				},
			})

			setConcession(res.data.data)
			setOriginal(res.data.data)
			setImageIsNew(false)
			showToast('success', 'Concession updated successfully')
		} catch (err) {
			console.error('Error updating concession:', err)
			showToast('error', 'Failed to update concession')
		} finally {
			setSaving(false)
		}
	}

	const handleToggleChange = async (field: keyof Concession, value: any) => {
		if (!concession) return
		setConcession({ ...concession, [field]: value })
	}

	useEffect(() => {
		fetchConcession()
	}, [])

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator
					size="large"
					color="darkred"
				/>
			</View>
		)
	}

	if (!concession) {
		return (
			<View style={styles.center}>
				<Text>No concession found.</Text>
			</View>
		)
	}

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<TouchableOpacity onPress={pickImage}>
				<Image
					source={{
						uri:
							imageIsNew ?
								imageAsset?.uri
							:	concession.image_url ||
								'https://static.thenounproject.com/png/3985543-200.png',
					}}
					style={styles.image}
				/>
				<Text style={styles.uploadText}>Tap to change image</Text>
			</TouchableOpacity>

			<View style={styles.card}>
				<Text style={styles.label}>Concession Name</Text>
				<TextInput
					style={styles.input}
					value={concession.concession_name}
					onChangeText={(text) =>
						setConcession({ ...concession, concession_name: text })
					}
				/>
				{errors.concession_name && (
					<Text style={styles.error}>{errors.concession_name}</Text>
				)}

				<Text style={styles.label}>Cafeteria</Text>
				<TextInput
					style={[styles.input, { backgroundColor: '#f0f0f0' }]}
					value={concession.cafeteria_name}
					editable={false}
				/>

				<Text style={styles.label}>Location</Text>
				<TextInput
					style={[styles.input, { backgroundColor: '#f0f0f0' }]}
					value={concession.location}
					editable={false}
				/>

				<View style={styles.toggleRow}>
					<Text style={styles.toggleLabel}>
						Status: {concession.status === 'open' ? 'Open' : 'Closed'}
					</Text>
					<Switch
						value={concession.status === 'open'}
						onValueChange={(val) =>
							setConcession({ ...concession, status: val ? 'open' : 'closed' })
						}
						trackColor={{ true: 'darkred' }}
						thumbColor={concession.status === 'open' ? '#fff' : '#f4f3f4'}
					/>
				</View>

				<Text style={[styles.label, { marginTop: 16 }]}>Payment Methods</Text>
				<View style={styles.toggleRow}>
					<Text style={styles.toggleLabel}>GCash</Text>
					<Switch
						value={concession.gcash_payment_available}
						onValueChange={(val) =>
							setConcession({ ...concession, gcash_payment_available: val })
						}
						trackColor={{ true: 'darkred' }}
						thumbColor={concession.gcash_payment_available ? '#fff' : '#f4f3f4'}
					/>
				</View>
				<View style={styles.toggleRow}>
					<Text style={styles.toggleLabel}>On-Counter</Text>
					<Switch
						value={concession.oncounter_payment_available}
						onValueChange={(val) =>
							setConcession({ ...concession, oncounter_payment_available: val })
						}
						trackColor={{ true: 'darkred' }}
						thumbColor={
							concession.oncounter_payment_available ? '#fff' : '#f4f3f4'
						}
					/>
				</View>

				<Text style={styles.label}>GCash Number</Text>
				<TextInput
					style={[
						styles.input,
						!concession.gcash_payment_available && {
							backgroundColor: '#f0f0f0',
							color: '#888',
						},
					]}
					value={concession.gcash_number || ''}
					placeholder="09XXXXXXXXX"
					editable={concession.gcash_payment_available}
					onChangeText={(text) =>
						setConcession({ ...concession, gcash_number: text })
					}
					keyboardType="numeric"
				/>
				{errors.gcash_number && (
					<Text style={styles.error}>{errors.gcash_number}</Text>
				)}

				<Text style={styles.label}>GCash Receipt Timer</Text>
				<TouchableOpacity
					style={[
						styles.timePickerButton,
						!concession.gcash_payment_available &&
							styles.timePickerButtonDisabled,
					]}
					onPress={() =>
						concession.gcash_payment_available && setShowTimePicker(true)
					}
					disabled={!concession.gcash_payment_available}>
					<View style={styles.timerDisplay}>
						{(() => {
							const [h, m, s] = (concession.receipt_timer || '00:15:00').split(
								':'
							)
							return (
								<>
									<View style={styles.timerUnit}>
										<Text
											style={[
												styles.timerValue,
												!concession.gcash_payment_available &&
													styles.timerValueDisabled,
											]}>
											{h}
										</Text>
										<Text
											style={[
												styles.timerLabel,
												!concession.gcash_payment_available &&
													styles.timerLabelDisabled,
											]}>
											hours
										</Text>
									</View>
									<Text
										style={[
											styles.timerColon,
											!concession.gcash_payment_available &&
												styles.timerColonDisabled,
										]}>
										:
									</Text>
									<View style={styles.timerUnit}>
										<Text
											style={[
												styles.timerValue,
												!concession.gcash_payment_available &&
													styles.timerValueDisabled,
											]}>
											{m}
										</Text>
										<Text
											style={[
												styles.timerLabel,
												!concession.gcash_payment_available &&
													styles.timerLabelDisabled,
											]}>
											minutes
										</Text>
									</View>
									<Text
										style={[
											styles.timerColon,
											!concession.gcash_payment_available &&
												styles.timerColonDisabled,
										]}>
										:
									</Text>
									<View style={styles.timerUnit}>
										<Text
											style={[
												styles.timerValue,
												!concession.gcash_payment_available &&
													styles.timerValueDisabled,
											]}>
											{s}
										</Text>
										<Text
											style={[
												styles.timerLabel,
												!concession.gcash_payment_available &&
													styles.timerLabelDisabled,
											]}>
											seconds
										</Text>
									</View>
								</>
							)
						})()}
					</View>
				</TouchableOpacity>
				{showTimePicker && (
					<DateTimePicker
						value={getTimePickerDate()}
						mode="time"
						is24Hour={true}
						display={Platform.OS === 'ios' ? 'spinner' : 'default'}
						onChange={handleTimeChange}
					/>
				)}
				<Text style={styles.helperText}>
					Time limit for customers to upload GCash receipt after order is
					accepted. Order will be automatically declined if time expires.
				</Text>
				{errors.receipt_timer && (
					<Text style={styles.error}>{errors.receipt_timer}</Text>
				)}
				<View style={{ marginTop: 20 }}>
					<Button
						title={saving ? 'Saving...' : 'Save Changes'}
						color="darkred"
						onPress={handleSave}
						disabled={saving}
					/>
				</View>
			</View>
		</ScrollView>
	)
}

export default Concession

const styles = StyleSheet.create({
	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	container: { padding: 16, alignItems: 'center' },
	card: {
		backgroundColor: '#fff',
		borderRadius: 10,
		padding: 16,
		marginTop: 12,
		width: '100%',
		elevation: 2,
	},
	image: {
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: '#eee',
		marginBottom: 6,
		alignSelf: 'center',
	},
	uploadText: {
		fontSize: 12,
		color: 'darkred',
		textAlign: 'center',
		marginBottom: 12,
	},
	label: { fontSize: 14, marginTop: 10, color: '#333' },
	input: {
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 8,
		padding: 8,
		marginTop: 4,
	},
	toggleRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginVertical: 8,
	},
	toggleLabel: { fontSize: 15, color: '#444' },
	helperText: { fontSize: 12, color: '#666', marginTop: 4 },
	timePickerButton: {
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 8,
		padding: 12,
		marginTop: 4,
		backgroundColor: '#fff',
		alignItems: 'center',
	},
	timePickerButtonDisabled: {
		backgroundColor: '#f0f0f0',
	},
	timePickerButtonText: {
		fontSize: 16,
		color: '#333',
		fontWeight: '600',
	},
	timePickerButtonTextDisabled: {
		color: '#888',
	},
	timerDisplay: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	timerUnit: {
		alignItems: 'center',
	},
	timerValue: {
		fontSize: 20,
		fontWeight: '700',
		color: '#333',
	},
	timerValueDisabled: {
		color: '#888',
	},
	timerLabel: {
		fontSize: 11,
		color: '#666',
		marginTop: 2,
	},
	timerLabelDisabled: {
		color: '#999',
	},
	timerColon: {
		fontSize: 20,
		fontWeight: '700',
		color: '#333',
		marginTop: -12,
	},
	timerColonDisabled: {
		color: '#888',
	},
	error: { color: 'red', fontSize: 12, marginTop: 4 },
})
