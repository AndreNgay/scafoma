// hooks/useNotifications.ts
import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import {
	registerForPushNotificationsAsync,
	addNotificationListener,
	addNotificationResponseListener,
	scheduleLocalNotification,
} from '../libs/notificationService'
import useStore from '../store'
import api from '../libs/apiCall'

interface NotificationData {
	id: number
	user_id: number
	notification_type: string
	message: string
	is_read: boolean
	order_id?: number
	created_at: string
	updated_at: string
}

export const useNotifications = () => {
	const notificationListener = useRef<Notifications.Subscription | null>(null)
	const responseListener = useRef<Notifications.Subscription | null>(null)
	const pollingInterval = useRef<NodeJS.Timeout | null>(null)
	const lastNotificationCountRef = useRef<number>(0)
	const { user } = useStore()
	const userId = user?.id

	useEffect(() => {
		if (!userId) return

		// Register for push notifications
		registerForPushNotificationsAsync().catch((err) => {
			console.log('Failed to register for push notifications:', err)
		})

		// Poll for new notifications every 30 seconds
		const pollForNotifications = async () => {
			try {
				const res = await api.get(`/notification/${userId}?page=1&limit=100`)
				const notifications: NotificationData[] = res.data.data || []
				const unreadNotifications = notifications.filter((n) => !n.is_read)
				const unreadCount = unreadNotifications.length

				// If there are new unread notifications, trigger local notification
				if (unreadCount > lastNotificationCountRef.current) {
					const newCount = unreadCount - lastNotificationCountRef.current
					const newNotifications = unreadNotifications.slice(0, newCount)

					for (const notif of newNotifications) {
						await scheduleLocalNotification(
							notif.notification_type,
							notif.message
						)
					}
				}

				lastNotificationCountRef.current = unreadCount
			} catch (err: any) {
				// Silently handle errors when backend is not available
				if (err?.response?.status !== 404 && err?.response?.status !== 500) {
					console.log('Unable to check notifications')
				}
			}
		}

		// Initial poll
		pollForNotifications()

		// Set up polling interval
		pollingInterval.current = setInterval(
			pollForNotifications,
			30000
		) as unknown as NodeJS.Timeout

		// Listen for notifications received while app is in foreground
		notificationListener.current = addNotificationListener(() => {
			// Refresh notification count when new notification arrives
			pollForNotifications()
		})

		// Listen for when user taps on notification
		responseListener.current = addNotificationResponseListener(() => {
			// Could navigate to notification screen here
			pollForNotifications()
		})

		return () => {
			if (notificationListener.current) {
				notificationListener.current.remove()
				notificationListener.current = null
			}
			if (responseListener.current) {
				responseListener.current.remove()
				responseListener.current = null
			}
			if (pollingInterval.current) {
				clearInterval(pollingInterval.current)
				pollingInterval.current = null
			}
		}
	}, [userId])

	return null
}

export default {}
