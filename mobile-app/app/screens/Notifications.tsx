import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import api from "../libs/apiCall";
import useStore from "../store";

const Notifications = () => {
  const { user } = useStore();
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

  const renderItem = ({ item }: { item: any }) => (
    <View
      style={[
        styles.notificationCard,
        { backgroundColor: item.is_read ? "#f5f5f5" : "#ffe5e5" },
      ]}
    >
      <Text style={styles.type}>{item.notification_type}</Text>
      <Text style={styles.message}>{item.message}</Text>
      <Text style={styles.date}>
        {new Date(item.created_at).toLocaleString()}
      </Text>
    </View>
  );

  if (loading)
    return (
      <ActivityIndicator size="large" color="#A40C2D" style={{ flex: 1 }} />
    );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Notifications</Text>

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
  header: { fontSize: 20, fontWeight: "bold", color: "#A40C2D", marginBottom: 10 },
  notificationCard: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  type: { fontWeight: "600", color: "#A40C2D", marginBottom: 5 },
  message: { fontSize: 14, marginBottom: 5 },
  date: { fontSize: 12, color: "#888" },
  empty: { textAlign: "center", color: "#888", marginTop: 20 },
  error: { textAlign: "center", color: "red", marginTop: 20 },
});

export default Notifications;
