// screens/auth/SignUp.tsx
import React, { useState } from 'react'
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ActivityIndicator,
	StyleSheet,
} from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigation } from '@react-navigation/native'
import api from '../../libs/apiCall'
import useStore from '../../store'
import {
	getPasswordInputProps,
	preventPaste,
} from '../../constants/passwordInput'

const RegisterSchema = z
	.object({
		first_name: z
			.string()
			.min(2, { message: 'First name must be at least 2 characters' }),
		last_name: z
			.string()
			.min(2, { message: 'Last name must be at least 2 characters' }),
		email: z.string().email({ message: 'Invalid email address' }),
		phone: z
			.string()
			.min(5, { message: 'Phone number must be at least 5 characters' }),
		password: z
			.string()
			.min(6, { message: 'Password must be at least 6 characters long' }),
		confirm_password: z
			.string()
			.min(1, { message: 'Please confirm your password' }),
		messenger_link: z.string().optional(),
	})
	.refine((data) => data.password === data.confirm_password, {
		message: 'Passwords do not match',
		path: ['confirm_password'],
	})

type RegisterForm = z.infer<typeof RegisterSchema>

const SignUp = () => {
	const [isLoading, setLoading] = useState(false)
	const [step, setStep] = useState<'profile' | 'contact'>('profile')
	const navigation = useNavigation<any>()
	const { setCredentials } = useStore((state) => state)

	const {
		control,
		handleSubmit,
		trigger,
		formState: { errors },
	} = useForm<RegisterForm>({
		resolver: zodResolver(RegisterSchema),
		defaultValues: {
			first_name: '',
			last_name: '',
			email: '',
			phone: '',
			password: '',
			confirm_password: '',
			messenger_link: '',
		},
	})

	const handleNext = async () => {
		const isValid = await trigger([
			'first_name',
			'last_name',
			'password',
			'confirm_password',
		])
		if (isValid) {
			setStep('contact')
		}
	}

	const onSubmit = async (data: RegisterForm) => {
		try {
			setLoading(true)
			const { confirm_password, ...payload } = data as any
			const { data: res } = await api.post('/auth/sign-up', payload)

			if (res?.user) {
				// Immediately sign in to retrieve token and persist it
				try {
					const signinRes = await api.post('/auth/sign-in', {
						email: payload.email,
						password: payload.password,
					})
					if (signinRes?.data?.user) {
						const userInfo = {
							...signinRes.data.user,
							token: signinRes.data.token,
						}
						await setCredentials(userInfo)
					}
				} catch (e) {
					console.warn('Auto sign-in after signup failed:', e)
				}

				alert(res?.message || 'Account created successfully!')
				navigation.navigate('SignIn') // go to sign-in screen
			} else {
				alert(res?.message || 'Something went wrong, please try again.')
			}
		} catch (error: any) {
			console.error('Sign-Up Error:', error)
			alert(
				error?.response?.data?.message || 'Sign-up failed. Please try again.'
			)
		} finally {
			setLoading(false)
		}
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Sign Up</Text>
			<Text style={styles.sectionTitle}>
				{step === 'profile' ? 'Profile' : 'Contact'}
			</Text>

			{step === 'profile' && (
				<>
					{/* First Name */}
					<Controller
						control={control}
						name="first_name"
						render={({ field: { onChange, value } }) => (
							<TextInput
								style={styles.input}
								placeholder="First Name"
								placeholderTextColor="#9f9f9f"
								value={value}
								onChangeText={onChange}
								editable={!isLoading}
							/>
						)}
					/>
					{errors.first_name && (
						<Text style={styles.error}>{errors.first_name.message}</Text>
					)}

					{/* Last Name */}
					<Controller
						control={control}
						name="last_name"
						render={({ field: { onChange, value } }) => (
							<TextInput
								style={styles.input}
								placeholder="Last Name"
								placeholderTextColor="#9f9f9f"
								value={value}
								onChangeText={onChange}
								editable={!isLoading}
							/>
						)}
					/>
					{errors.last_name && (
						<Text style={styles.error}>{errors.last_name.message}</Text>
					)}

					{/* Password */}
					<Controller
						control={control}
						name="password"
						render={({ field: { onChange, value } }) => (
							<TextInput
								{...getPasswordInputProps({
									textContentType: 'newPassword',
									autoComplete: 'password-new',
								})}
								style={styles.input}
								placeholder="Password"
								placeholderTextColor="#9f9f9f"
								value={value}
								onChangeText={onChange}
								editable={!isLoading}
							/>
						)}
					/>
					{errors.password && (
						<Text style={styles.error}>{errors.password.message}</Text>
					)}

					{/* Confirm Password */}
					<Controller
						control={control}
						name="confirm_password"
						render={({ field: { onChange, value } }) => (
							<TextInput
								{...getPasswordInputProps({
									textContentType: 'newPassword',
									autoComplete: 'password-new',
								})}
								style={styles.input}
								placeholder="Confirm Password"
								placeholderTextColor="#9f9f9f"
								value={value}
								onChangeText={onChange}
								editable={!isLoading}
							/>
						)}
					/>
					{errors.confirm_password && (
						<Text style={styles.error}>{errors.confirm_password.message}</Text>
					)}
				</>
			)}

			{step === 'contact' && (
				<>
					{/* Email */}
					<Controller
						control={control}
						name="email"
						render={({ field: { onChange, value } }) => (
							<TextInput
								style={styles.input}
								placeholder="Email"
								placeholderTextColor="#9f9f9f"
								keyboardType="email-address"
								value={value}
								onChangeText={onChange}
								editable={!isLoading}
							/>
						)}
					/>
					{errors.email && (
						<Text style={styles.error}>{errors.email.message}</Text>
					)}

					<Controller
						control={control}
						name="phone"
						render={({ field: { onChange, value } }) => (
							<TextInput
								style={styles.input}
								placeholder="Phone Number"
								placeholderTextColor="#9f9f9f"
								keyboardType="phone-pad"
								value={value}
								onChangeText={onChange}
								editable={!isLoading}
							/>
						)}
					/>
					{errors.phone && (
						<Text style={styles.error}>{errors.phone.message}</Text>
					)}

					<Controller
						control={control}
						name="messenger_link"
						render={({ field: { onChange, value } }) => (
							<TextInput
								style={styles.input}
								placeholder="Messenger/Facebook link (optional)"
								placeholderTextColor="#9f9f9f"
								value={value}
								onChangeText={onChange}
								editable={!isLoading}
							/>
						)}
					/>
				</>
			)}

			{/* Submit */}
			{step === 'profile' ?
				<TouchableOpacity
					style={[styles.button, isLoading && { opacity: 0.6 }]}
					onPress={handleNext}
					disabled={isLoading}>
					{isLoading ?
						<ActivityIndicator color="#fff" />
					:	<Text style={styles.buttonText}>Next</Text>}
				</TouchableOpacity>
			:	<TouchableOpacity
					style={[styles.button, isLoading && { opacity: 0.6 }]}
					onPress={handleSubmit(onSubmit)}
					disabled={isLoading}>
					{isLoading ?
						<ActivityIndicator color="#fff" />
					:	<Text style={styles.buttonText}>Sign Up</Text>}
				</TouchableOpacity>
			}

			{/* Already Have Account */}
			<TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
				<Text style={styles.link}>
					Already have an account?{' '}
					<Text style={styles.linkHighlight}>Sign In</Text>{' '}
				</Text>
			</TouchableOpacity>
		</View>
	)
}

export default SignUp

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F9FAFB',
		padding: 20,
		justifyContent: 'center',
	},
	title: {
		fontSize: 26,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 20,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		textAlign: 'center',
		marginBottom: 16,
	},
	input: {
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 8,
		padding: 12,
		marginBottom: 6,
	},
	error: {
		color: 'red',
		fontSize: 12,
		marginBottom: 10,
	},
	button: {
		backgroundColor: '#A40C2D',
		padding: 14,
		borderRadius: 8,
		alignItems: 'center',
		marginTop: 10,
	},
	buttonText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 16,
	},
	link: {
		marginTop: 16,
		textAlign: 'center',
		color: '#374151',
		fontWeight: '500',
	},
	linkHighlight: {
		color: '#A40C2D',
		fontWeight: '600',
	},
})
