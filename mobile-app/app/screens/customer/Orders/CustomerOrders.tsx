import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Modal,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import useStore from "../../../store";
import api from "../../../libs/apiCall";
import { useToast } from "../../../contexts/ToastContext";

const PAGE_SIZE = 10;
const ACTIVE_STATUSES = ["pending", "accepted", "ready-for-pickup"];
const HISTORY_STATUSES = ["completed", "declined", "cancelled"];

const CustomerOrders = () => {
  const navigation = useNavigation<any>();
  const user = useStore((state: any) => state.user);
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("date_desc");
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const { showToast } = useToast();

  const formatManila = (value: any) => {
    if (!value) return "";
    try {
      if (typeof value === "string") {
        // If the string has timezone info, use it but render in Asia/Manila
        if (/[zZ]|[+-]\d{2}:?\d{2}/.test(value)) {
          const d = new Date(value);
          return new Intl.DateTimeFormat("en-PH", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "numeric",
            minute: "2-digit",
          }).format(d);
        }
        // No timezone info: assume it's already Asia/Manila local time; format manually
        const cleaned = value.replace("T", " ");
        const [datePart, timePartFull] = cleaned.split(" ");
        if (!datePart || !timePartFull) return cleaned;
        const [year, month, day] = datePart.split("-").map((p) => parseInt(p, 10));
        const [hStr, mStr] = timePartFull.split(":");
        if (!year || !month || !day || !hStr || !mStr) return cleaned;
        let hour = parseInt(hStr, 10);
        const ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12;
        if (hour === 0) hour = 12;
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return `${monthNames[month - 1]} ${day}, ${year} ${hour}:${mStr} ${ampm}`;
      }
      // Non-string dates
      return new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return String(value);
    }
  };

  const formatSchedule = (value: any) => formatManila(value);
  const formatDateTime = (value: any) => formatManila(value);

  // Normalize status strings for consistent filtering (e.g., "ready-for-pickup" vs "ready for pickup")
  const normalizeStatus = (value: any) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, "-");

  // Fetch active (ongoing) customer orders only (non-paginated)
  const fetchOrders = useCallback(
    async (refresh = false) => {
      if (!user) return;
      try {
        if (!refresh) {
          setInitialLoading(true); // full screen loader
        }

        const res = await api.get(
          `/order/customer/${user.id}?segment=active&limit=${PAGE_SIZE}`
        );

        const responseData = res.data?.data || [];
        setOrders(responseData);

        // Active segment is treated as a single page
        setPage(0);
        setHasMore(false);
        setHistoryLoaded(false);
      } catch (err) {
        console.error("Error fetching customer orders:", err);
        setOrders([]);
        setFilteredOrders([]);
      } finally {
        setLoading(false);
        setInitialLoading(false);
        if (refresh) setRefreshing(false);
      }
    },
    [user]
  );

  // Lazily fetch completed/declined history with pagination
  const fetchHistory = useCallback(
    async (pageNum = 1) => {
      if (!user) return;
      try {
        setLoading(true);

        const res = await api.get(
          `/order/customer/${user.id}?segment=history&page=${pageNum}&limit=${PAGE_SIZE}`
        );
        const responseData = res.data?.data || [];
        const totalPages = Number(res.data?.totalPages) || 1;

        setOrders((prevOrders) => {
          if (!prevOrders || prevOrders.length === 0) return responseData;
          const existingIds = new Set(prevOrders.map((o: any) => o.id));
          const deduped = responseData.filter((o: any) => !existingIds.has(o.id));
          return [...prevOrders, ...deduped];
        });

        setPage(pageNum);
        setHasMore(pageNum < totalPages);
        setHistoryLoaded(true);
      } catch (err) {
        console.error("Error fetching customer order history:", err);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      setPage(1);
      setHasMore(true);
      setHistoryLoaded(false);
      setStatusFilter(ACTIVE_STATUSES); // Default to ongoing orders only
      setSortBy("date_desc"); // Default sort by newest to oldest
      fetchOrders(true);
    }, [fetchOrders])
  );

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchOrders(true);
  };

  // Load more on scroll
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;

    const involvesHistory = statusFilter.some((s) =>
      HISTORY_STATUSES.includes(normalizeStatus(s))
    );
    if (!involvesHistory) return;

    const nextPage = page + 1;
    fetchHistory(nextPage);
  }, [loading, hasMore, statusFilter, page, fetchHistory]);

  // When history statuses are selected, lazily fetch them once
  useEffect(() => {
    const involvesHistory = statusFilter.some((s) =>
      HISTORY_STATUSES.includes(normalizeStatus(s))
    );
    if (involvesHistory && !historyLoaded) {
      fetchHistory(1);
    }
  }, [statusFilter, historyLoaded, fetchHistory]);

  // Apply search & filter
  useEffect(() => {
    let filtered = [...orders];

    if (searchQuery) {
      const lowered = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.cafeteria_name.toLowerCase().includes(lowered) ||
          o.concession_name.toLowerCase().includes(lowered)
      );
    }

    // Filter by status (normalized)
    if (statusFilter.length > 0) {
      const normalizedSelected = new Set(
        statusFilter.map((s) => normalizeStatus(s))
      );
      filtered = filtered.filter((o) =>
        normalizedSelected.has(normalizeStatus(o.order_status))
      );
    }

    // Sort orders
    if (sortBy) {
      switch (sortBy) {
        case "date_desc":
          filtered.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
          break;
        case "date_asc":
          filtered.sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );
          break;
        case "price_asc":
          filtered.sort((a, b) => {
            const totalA = Number(
              (a as any).updated_total_price ?? a.total_price ?? 0
            );
            const totalB = Number(
              (b as any).updated_total_price ?? b.total_price ?? 0
            );
            return totalA - totalB;
          });
          break;
        case "price_desc":
          filtered.sort((a, b) => {
            const totalA = Number(
              (a as any).updated_total_price ?? a.total_price ?? 0
            );
            const totalB = Number(
              (b as any).updated_total_price ?? b.total_price ?? 0
            );
            return totalB - totalA;
          });
          break;
        case "status":
          filtered.sort((a, b) => a.order_status.localeCompare(b.order_status));
          break;
      }
    }

    setFilteredOrders(filtered);
  }, [searchQuery, statusFilter, sortBy, orders]);

  const handleConfirmCancelOrder = async () => {
    if (!cancelOrderId) return;

    try {
      setCancelLoading(true);
      await api.put(`/order/cancel/${cancelOrderId}`);
      showToast("success", "Order cancelled successfully");
      await fetchOrders(true);
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      const message =
        error.response?.data?.error || "Failed to cancel order. Please try again.";
      showToast("error", message);
    } finally {
      setCancelLoading(false);
      setCancelOrderId(null);
    }
  };

  const renderItem = ({ item }: any) => {
    const cancelOrder = () => {
      setCancelOrderId(item.id);
    };

    const itemNames: string[] = Array.isArray(item.item_names_preview) ? item.item_names_preview : [];
    const itemCount: number = typeof item.item_count === 'number' ? item.item_count : (item.items_count || 0);
    const extraCount = Math.max(0, itemCount - itemNames.length);

    return (
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => navigation.navigate("View Order", { orderId: item.id })}
          style={styles.cardContent}
        >
          {/* ✅ Order ID */}
          <Text style={styles.orderId}>Order #{item.id}</Text>

          <Text style={styles.title}>
            {item.cafeteria_name} • {item.concession_name}
          </Text>
          {itemNames.length > 0 && (
            <Text style={styles.itemsPreview}>
              Items: {itemNames.join(', ')}{extraCount > 0 ? ` +${extraCount} more` : ''}
            </Text>
          )}
          <Text>
            Status: <Text style={styles.status}>{item.order_status}</Text>
          </Text>
          {item.order_status === 'declined' && !!item.decline_reason && (
            <Text style={styles.declineReason}>Reason: {item.decline_reason}</Text>
          )}
          {item.updated_total_price !== null &&
          item.updated_total_price !== undefined &&
          !Number.isNaN(Number(item.updated_total_price)) &&
          !Number.isNaN(Number(item.total_price)) &&
          Number(item.updated_total_price) !== Number(item.total_price) ? (
            <Text>
              Total: ₱{Number(item.updated_total_price).toFixed(2)} (was ₱
              {Number(item.total_price).toFixed(2)})
            </Text>
          ) : (
            <Text>Total: ₱{Number(item.total_price).toFixed(2)}</Text>
          )}
          {item.schedule_time && (
            <Text style={styles.scheduleTime}>
              📅 Scheduled: {formatSchedule(item.schedule_time)}
            </Text>
          )}
          <Text style={styles.date}>
            {formatDateTime(item.created_at)}
          </Text>
        </TouchableOpacity>

        {/* Cancel Button - Only show for pending orders */}
        {item.order_status === 'pending' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={cancelOrder}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Full-screen loader for initial load
  if (initialLoading) {
    return (
      <View style={styles.fullLoader}>
        <ActivityIndicator size="large" color="#A40C2D" />
        <Text style={{ marginTop: 10, color: "#A40C2D" }}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Orders</Text>

      {/* Search + Filter */}
      <View style={styles.searchFilterRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search orders..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Filter button */}
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setFiltersVisible(true)}
        >
          <Ionicons name="funnel-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Orders list */}
      {filteredOrders.length === 0 ? (
        <Text style={styles.emptyText}>No orders found</Text>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A40C2D" />
          }
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

      {/* Filter modal */}
      <Modal visible={filtersVisible} animationType="slide">
        <View style={styles.filterContainer}>
          <View style={styles.filterHeaderContainer}>
            <Text style={styles.filterHeader}>Filter Orders</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setFiltersVisible(false)}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Status filter */}
          <Text style={styles.label}>Status (Select Multiple)</Text>
          <View style={styles.filterChipRow}>
            {["pending", "accepted", "ready-for-pickup", "completed", "declined", "cancelled"].map(
              (status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => {
                    if (statusFilter.includes(status)) {
                      setStatusFilter(statusFilter.filter((s) => s !== status));
                    } else {
                      setStatusFilter([...statusFilter, status]);
                    }
                  }}
                >
                  <Text
                    style={
                      statusFilter.includes(status) ? styles.active : styles.option
                    }
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {/* Sort options */}
          <Text style={styles.label}>Sort by</Text>
          <View style={styles.filterChipRow}>
            {[
              { key: "date_desc", label: "Date (Newest → Oldest)" },
              { key: "date_asc", label: "Date (Oldest → Newest)" },
              { key: "price_asc", label: "Total Price (Low → High)" },
              { key: "price_desc", label: "Total Price (High → Low)" },
              { key: "status", label: "Status (A → Z)" },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setSortBy(opt.key)}
              >
                <Text
                  style={sortBy === opt.key ? styles.active : styles.option}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Close modal */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                setStatusFilter(ACTIVE_STATUSES);
                setSortBy("date_desc");
              }}
            >
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => setFiltersVisible(false)}
            >
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        transparent
        visible={cancelOrderId !== null}
        animationType="fade"
        onRequestClose={() => setCancelOrderId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Cancel Order</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to cancel this order? This action cannot be undone.
            </Text>
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setCancelOrderId(null)}
                disabled={cancelLoading}
              >
                <Text style={styles.modalCancelText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleConfirmCancelOrder}
                disabled={cancelLoading}
              >
                <Text style={styles.modalConfirmText}>
                  {cancelLoading ? "Cancelling..." : "Yes, Cancel"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 15 },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#A40C2D",
  },
  searchFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    columnGap: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#A40C2D",
    borderRadius: 999,
  },
  filterText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  card: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 5 },
  status: { color: "#A40C2D", fontWeight: "600" },
  itemsPreview: { fontSize: 12, color: "#333", marginBottom: 4 },
  declineReason: { color: "#dc3545", fontSize: 12, fontStyle: "italic", marginTop: 2 },
  date: { fontSize: 12, color: "#666", marginTop: 5 },
  emptyText: { textAlign: "center", marginTop: 20, color: "#888" },
  filterContainer: { flex: 1, padding: 20, backgroundColor: "#fff" },
  filterHeaderContainer: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 20 
  },
  filterHeader: { fontSize: 18, fontWeight: "bold" },
  closeBtn: {
    backgroundColor: "#ccc",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  label: { marginTop: 15, fontWeight: "600" },
  filterChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },
  option: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ccc",
    color: "#333",
  },
  active: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    borderRadius: 999,
    backgroundColor: "#A40C2D",
    borderWidth: 1,
    borderColor: "#A40C2D",
    color: "#fff",
  },
  buttonRow: { 
    flexDirection: "row", 
    marginTop: 20, 
    gap: 10 
  },
  clearBtn: {
    flex: 1,
    backgroundColor: "#ccc",
    padding: 12,
    borderRadius: 8,
  },
  clearText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  applyBtn: {
    flex: 1,
    backgroundColor: "#A40C2D",
    padding: 12,
    borderRadius: 8,
  },
  applyText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  orderId: {
  fontSize: 13,
  fontWeight: "600",
  color: "#555",
  marginBottom: 3,
},
scheduleTime: {
  fontSize: 12,
  color: "#28a745",
  fontWeight: "500",
  marginTop: 3,
},
cardContent: {
  flex: 1,
},
cancelButton: {
  backgroundColor: "#d32f2f",
  paddingVertical: 8,
  paddingHorizontal: 16,
  borderRadius: 6,
  alignSelf: "flex-end",
  marginTop: 8,
},
cancelButtonText: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "600",
},
fullLoader: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
},
toastContainer: {
  marginTop: 12,
  padding: 10,
  borderRadius: 8,
  alignItems: "center",
},
toastSuccess: {
  backgroundColor: "#4caf50",
},
toastError: {
  backgroundColor: "#f44336",
},
toastInfo: {
  backgroundColor: "#333",
},
toastText: {
  color: "#fff",
  fontSize: 13,
},
modalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.4)",
  justifyContent: "center",
  alignItems: "center",
},
modalBox: {
  width: "85%",
  backgroundColor: "#fff",
  borderRadius: 10,
  padding: 20,
},
modalTitle: {
  fontSize: 18,
  fontWeight: "600",
  marginBottom: 8,
},
modalMessage: {
  fontSize: 14,
  color: "#555",
  marginBottom: 16,
},
modalButtonsRow: {
  flexDirection: "row",
  justifyContent: "flex-end",
  gap: 10,
},
modalButton: {
  paddingVertical: 8,
  paddingHorizontal: 14,
  borderRadius: 6,
},
modalCancelButton: {
  backgroundColor: "#eee",
},
modalConfirmButton: {
  backgroundColor: "#d32f2f",
},
modalCancelText: {
  color: "#333",
  fontWeight: "500",
},
modalConfirmText: {
  color: "#fff",
  fontWeight: "600",
},
});

export default CustomerOrders;
