import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import api from "../libs/apiCall";
import useStore from "../store";
import { scheduleLocalNotification } from "../libs/notificationService";

const Notifications = () => {
  const { user } = useStore();
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Fetch notifications for the current user
  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError("");

      const res = await api.get(`/notification/${user.id}`);
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.get(`/notification/${user.id}`);
      setNotifications(res.data.notifications || []);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to refresh notifications");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?.id]);

  // Refresh notifications when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        fetchNotifications();
      }
    }, [user?.id])
  );

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationPress = async (item: any) => {
    // Mark as read
    if (!item.is_read) {
      try {
        await api.put(`/notification/${item.id}/read`);
        setNotifications(prev => 
          prev.map(n => n.id === item.id ? { ...n, is_read: true } : n)
        );
      } catch (err) {
        console.error("Error marking notification as read:", err);
      }
    }

    // Navigate to order if present
    const orderId = item.order_id;
    if (orderId) {
      if (user?.role === 'concessionaire') {
        navigation.navigate('Order List', { screen: 'View Order', params: { orderId } });
      } else if (user?.role === 'customer') {
        navigation.navigate('Orders', { screen: 'View Order', params: { orderId } });
      }
      return;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => handleNotificationPress(item)}
    >
      <View
        style={[
          styles.notificationCard,
          { backgroundColor: item.is_read ? "#f5f5f5" : "#ffe5e5" },
          !item.is_read && styles.unreadCard,
        ]}
      >
        {!item.is_read && <View style={styles.unreadDot} />}
        <View style={styles.cardContent}>
          <Text style={styles.type}>{item.notification_type}</Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading)
    return (
      <ActivityIndicator size="large" color="#A40C2D" style={{ flex: 1 }} />
    );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : notifications.length === 0 ? (
        <Text style={styles.empty}>No notifications yet</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshing={refreshing}
          onRefresh={onRefresh} // Pull-to-refresh
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#fff" },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  header: { fontSize: 20, fontWeight: "bold", color: "#A40C2D" },
  badge: {
    backgroundColor: "#A40C2D",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  notificationCard: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    flexDirection: "row",
  },
  unreadCard: {
    borderWidth: 2,
    borderColor: "#A40C2D",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#A40C2D",
    marginRight: 10,
    marginTop: 6,
  },
  cardContent: {
    flex: 1,
  },
  type: { fontWeight: "600", color: "#A40C2D", marginBottom: 5 },
  message: { fontSize: 14, marginBottom: 5 },
  date: { fontSize: 12, color: "#888" },
  empty: { textAlign: "center", color: "#888", marginTop: 20 },
  error: { textAlign: "center", color: "red", marginTop: 20 },
});

export default Notifications;
