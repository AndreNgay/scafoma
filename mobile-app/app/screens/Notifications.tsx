import React, { useCallback, useEffect, useState } from "react";
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
import { formatManilaTime } from "../utils/time";

const PAGE_SIZE = 10;

interface NotificationItem {
  id: number;
  user_id: number;
  notification_type: string;
  message: string;
  is_read: boolean;
  order_id?: number;
  created_at: string;
  updated_at: string;
}

const Notifications = () => {
  const { user } = useStore();
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch notifications for the current user, paginated
  const fetchNotifications = useCallback(
    async (pageNum = 1, refresh = false, retryCount = 0) => {
      if (!user?.id) return;

      try {
        if (!refresh && pageNum > 1) {
          setLoading(true); // footer loader
        }
        if (pageNum === 1 && !refresh) {
          setInitialLoading(true); // full screen loader
        }
        setError("");

        const res = await api.get(
          `/notification/${user.id}?page=${pageNum}&limit=${PAGE_SIZE}`,
        );
        const responseData = res.data.data || res.data.notifications || [];
        const totalPages = Number(res.data.totalPages) || 1;

        if (refresh || pageNum === 1) {
          setNotifications(responseData);
        } else {
          setNotifications((prev) => [...prev, ...responseData]);
        }
        setHasMore(pageNum < totalPages);
      } catch (err: any) {
        console.error(err);

        // Handle database connection errors with retry logic
        const isConnectionError =
          err.response?.status === 503 ||
          err.code === "ECONNRESET" ||
          err.code === "ENOTFOUND" ||
          err.code === "ETIMEDOUT" ||
          err.message?.includes("connection");

        if (isConnectionError && retryCount < 3) {
          console.log(
            `Retrying fetch notifications (attempt ${retryCount + 1})`,
          );
          // Exponential backoff: wait 1s, 2s, 4s
          setTimeout(
            () => {
              fetchNotifications(pageNum, refresh, retryCount + 1);
            },
            Math.pow(2, retryCount) * 1000,
          );
          return;
        }

        const errorMessage = isConnectionError
          ? "Connection issue. Please check your internet and try again."
          : "Failed to load notifications";

        setError(errorMessage);
        if (pageNum === 1) {
          setNotifications([]);
        }
      } finally {
        setLoading(false);
        setInitialLoading(false);
        if (refresh) setRefreshing(false);
      }
    },
    [user?.id],
  );

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await fetchNotifications(1, true);
  };

  useEffect(() => {
    setPage(1);
    fetchNotifications(1, true);
  }, [fetchNotifications]);

  // Refresh notifications when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setPage(1);
      fetchNotifications(1, true);
    }, [fetchNotifications]),
  );

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage((prev) => {
        const next = prev + 1;
        fetchNotifications(next);
        return next;
      });
    }
  }, [loading, hasMore, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markNotificationAsRead = async (
    notificationId: number,
    retryCount = 0,
  ) => {
    try {
      await api.put(`/notification/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n,
        ),
      );
    } catch (err: any) {
      console.error("Error marking notification as read:", err);

      // Handle database connection errors with retry logic
      const isConnectionError =
        err.response?.status === 503 ||
        err.code === "ECONNRESET" ||
        err.code === "ENOTFOUND" ||
        err.code === "ETIMEDOUT" ||
        err.message?.includes("connection");

      if (isConnectionError && retryCount < 2) {
        console.log(`Retrying mark as read (attempt ${retryCount + 1})`);
        setTimeout(
          () => {
            markNotificationAsRead(notificationId, retryCount + 1);
          },
          Math.pow(2, retryCount) * 1000,
        );
      }
    }
  };

  const handleMarkAllAsRead = async (retryCount = 0) => {
    if (!user?.id || unreadCount === 0) return;

    try {
      await api.put(`/notification/${user.id}/read-all`);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err: any) {
      console.error("Error marking all notifications as read:", err);

      // Handle database connection errors with retry logic
      const isConnectionError =
        err.response?.status === 503 ||
        err.code === "ECONNRESET" ||
        err.code === "ENOTFOUND" ||
        err.code === "ETIMEDOUT" ||
        err.message?.includes("connection");

      if (isConnectionError && retryCount < 2) {
        console.log(`Retrying mark all as read (attempt ${retryCount + 1})`);
        setTimeout(
          () => {
            handleMarkAllAsRead(retryCount + 1);
          },
          Math.pow(2, retryCount) * 1000,
        );
      }
    }
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    // Mark as read
    if (!item.is_read) {
      await markNotificationAsRead(item.id);
    }

    // Navigate to order if present
    const orderId = item.order_id;
    if (orderId) {
      if (user?.role === "concessionaire") {
        navigation.navigate("Order List", {
          screen: "View Order",
          params: { orderId },
        });
      } else if (user?.role === "customer") {
        navigation.navigate("Orders", {
          screen: "View Order",
          params: { orderId },
        });
      }
      return;
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity onPress={() => handleNotificationPress(item)}>
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
          <Text style={styles.date}>{formatManilaTime(item.created_at)}</Text>
        </View>
        {!item.is_read && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.markReadButton}
              onPress={() => markNotificationAsRead(item.id)}
            >
              <Text style={styles.markReadText}>Mark as read</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (initialLoading)
    return (
      <ActivityIndicator size="large" color="#A40C2D" style={{ flex: 1 }} />
    );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.headerRight}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
            >
              <Text style={styles.markAllButtonText}>Mark all as read</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchNotifications(1, true)}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
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
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={false}
          ListFooterComponent={
            loading && page > 1 ? (
              <ActivityIndicator
                size="small"
                color="#A40C2D"
                style={{ marginVertical: 10 }}
              />
            ) : null
          }
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
  },
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
  actionsRow: {
    justifyContent: "center",
    marginLeft: 10,
  },
  markReadButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A40C2D",
    alignSelf: "center",
  },
  markReadText: {
    fontSize: 12,
    color: "#A40C2D",
    fontWeight: "600",
  },
  markAllButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A40C2D",
  },
  markAllButtonText: {
    fontSize: 12,
    color: "#A40C2D",
    fontWeight: "600",
  },
  type: { fontWeight: "600", color: "#A40C2D", marginBottom: 5 },
  message: { fontSize: 14, marginBottom: 5 },
  date: { fontSize: 12, color: "#888" },
  empty: { textAlign: "center", color: "#888", marginTop: 20 },
  error: { textAlign: "center", color: "red", marginTop: 20 },
  errorContainer: {
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#A40C2D",
    borderRadius: 6,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default Notifications;
