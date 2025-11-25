// libs/notificationService.ts
import type * as NotificationsTypes from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import Constants from 'expo-constants'

const isExpoGo = Constants.appOwnership === 'expo'

let Notifications: typeof NotificationsTypes | null = null

if (!isExpoGo) {
	Notifications = require('expo-notifications') as typeof NotificationsTypes

	// Configure how notifications are handled when the app is in the foreground
	Notifications.setNotificationHandler({
		handleNotification: async () => ({
			shouldPlaySound: true,
			shouldSetBadge: true,
			shouldShowBanner: true,
			shouldShowList: true,
		}),
	})
}

// Request notification permissions
export const registerForPushNotificationsAsync = async (): Promise<
	string | undefined
> => {
	let token = ''

	if (isExpoGo) {
		console.log(
			'Skipping push token registration in Expo Go. Use a development build for push notifications.'
		)
		return undefined
	}

	if (!Notifications) {
		console.log('Notifications module not available')
		return undefined
	}

	if (Platform.OS === 'android') {
		await Notifications.setNotificationChannelAsync('default', {
			name: 'default',
			importance: Notifications.AndroidImportance.MAX,
			vibrationPattern: [0, 250, 250, 250],
			lightColor: '#FF231F7C',
		})
	}

	if (Device.isDevice) {
		const { status: existingStatus } = await Notifications.getPermissionsAsync()
		let finalStatus = existingStatus

		if (existingStatus !== 'granted') {
			const { status } = await Notifications.requestPermissionsAsync()
			finalStatus = status
		}

		if (finalStatus !== 'granted') {
			console.log('Push notification permission not granted')
			return undefined
		}

		// Get the Expo push token
		try {
			token = (await Notifications.getExpoPushTokenAsync()).data
			console.log('Expo Push Token:', token)
		} catch (error) {
			console.log('Error getting push token:', error)
			return undefined
		}
	} else {
		console.log('Must use physical device for Push Notifications')
	}

	return token
}

// Schedule a local notification
export const scheduleLocalNotification = async (
	title: string,
	body: string,
	data: Record<string, any> = {}
): Promise<void> => {
	if (!Notifications) return
	try {
		await Notifications.scheduleNotificationAsync({
			content: {
				title,
				body,
				data,
				sound: true,
			},
			trigger: null, // Send immediately
		})
	} catch (error) {
		console.log('Error scheduling notification:', error)
	}
}

// Listen for notifications
export const addNotificationListener = (
	handler: (notification: NotificationsTypes.Notification) => void
): NotificationsTypes.Subscription => {
	if (!Notifications) {
		return { remove: () => {} } as NotificationsTypes.Subscription
	}
	return Notifications.addNotificationReceivedListener(handler)
}

// Handle notification responses (when user taps on notification)
export const addNotificationResponseListener = (
	handler: (response: NotificationsTypes.NotificationResponse) => void
): NotificationsTypes.Subscription => {
	if (!Notifications) {
		return { remove: () => {} } as NotificationsTypes.Subscription
	}
	return Notifications.addNotificationResponseReceivedListener(handler)
}

// Cancel all notifications
export const cancelAllNotifications = async (): Promise<void> => {
	if (!Notifications) return
	await Notifications.cancelAllScheduledNotificationsAsync()
}

// Get badge count
export const getBadgeCount = async (): Promise<number> => {
	if (!Notifications) return 0
	return await Notifications.getBadgeCountAsync()
}

// Set badge count
export const setBadgeCount = async (count: number): Promise<void> => {
	if (!Notifications) return
	await Notifications.setBadgeCountAsync(count)
}

const NotificationServiceScreen = () => null

export default NotificationServiceScreen
