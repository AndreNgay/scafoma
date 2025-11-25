// libs/notificationService.ts
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import Constants from 'expo-constants'

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldPlaySound: true,
		shouldSetBadge: true,
		shouldShowBanner: true,
		shouldShowList: true,
	}),
})

// Request notification permissions
export const registerForPushNotificationsAsync = async (): Promise<
	string | undefined
> => {
	let token = ''

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
	handler: (notification: Notifications.Notification) => void
): Notifications.Subscription => {
	return Notifications.addNotificationReceivedListener(handler)
}

// Handle notification responses (when user taps on notification)
export const addNotificationResponseListener = (
	handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription => {
	return Notifications.addNotificationResponseReceivedListener(handler)
}

// Cancel all notifications
export const cancelAllNotifications = async (): Promise<void> => {
	await Notifications.cancelAllScheduledNotificationsAsync()
}

// Get badge count
export const getBadgeCount = async (): Promise<number> => {
	return await Notifications.getBadgeCountAsync()
}

// Set badge count
export const setBadgeCount = async (count: number): Promise<void> => {
	await Notifications.setBadgeCountAsync(count)
}
