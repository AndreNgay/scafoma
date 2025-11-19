// hooks/useNotifications.js
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, addNotificationListener, addNotificationResponseListener, scheduleLocalNotification } from '../libs/notificationService';
import { Platform } from 'react-native';
import useStore from '../store';
import api from '../libs/apiCall';

export const useNotifications = () => {
  const notificationListener = useRef(null);
  const responseListener = useRef(null);
  const pollingInterval = useRef(null);
  const { user } = useStore();

  useEffect(() => {
    if (!user?.id) return;

    // Register for push notifications
    registerForPushNotificationsAsync();

    let lastNotificationCount = 0;

    // Poll for new notifications every 30 seconds
    const pollForNotifications = async () => {
      try {
        const res = await api.get(`/notification/${user.id}`);
        const notifications = res.data.notifications || [];
        const unreadNotifications = notifications.filter(n => !n.is_read);
        const unreadCount = unreadNotifications.length;

        // If there are new unread notifications, trigger local notification
        if (unreadCount > lastNotificationCount) {
          const newCount = unreadCount - lastNotificationCount;
          const newNotifications = unreadNotifications.slice(0, newCount);

          for (const notif of newNotifications) {
            await scheduleLocalNotification(
              notif.notification_type,
              notif.message
            );
          }
        }

        lastNotificationCount = unreadCount;
      } catch (err) {
        console.error("Error polling for notifications:", err);
      }
    };

    // Initial poll
    pollForNotifications();
    
    // Set up polling interval
    pollingInterval.current = setInterval(pollForNotifications, 30000); // Poll every 30 seconds

    // Listen for notifications received while app is in foreground
    notificationListener.current = addNotificationListener(() => {
      // No-op; side effects handled elsewhere if needed
    });

    // Listen for when user taps on notification
    responseListener.current = addNotificationResponseListener(() => {
      // You can navigate to specific screen based on notification
    });

    return () => {
      if (notificationListener.current?.remove) {
        notificationListener.current.remove();
      }
      if (responseListener.current?.remove) {
        responseListener.current.remove();
      }
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [user?.id]);

  return null;
};

// Default export to satisfy Expo Router when it scans this file under the app directory
const UseNotificationsScreen = () => null;
export default UseNotificationsScreen;
