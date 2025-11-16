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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import useStore from "../../../store";
import api from "../../../libs/apiCall";
import { useToast } from "../../../contexts/ToastContext";

const PAGE_SIZE = 10;

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

  // Fetch customer orders with pagination
  const fetchOrders = useCallback(async (pageNum = 1, refresh = false) => {
    if (!user) return;
    try {
      if (!refresh && pageNum > 1) {
        setLoading(true); // show footer loader
      }
      if (pageNum === 1 && !refresh) {
        setInitialLoading(true); // full screen loader
      }

      const res = await api.get(`/order/customer/${user.id}?page=${pageNum}&limit=${PAGE_SIZE}`);
      
      // Backend returns { page, limit, total, totalPages, data }
      const responseData = res.data.data || [];
      const totalPages = Number(res.data.totalPages) || 1;

      if (refresh || pageNum === 1) {
        setOrders(responseData);
      } else {
        // Use functional update to avoid stale closure
        setOrders((prevOrders) => [...prevOrders, ...responseData]);
      }

      setHasMore(pageNum < totalPages);
    } catch (err) {
      console.error("Error fetching customer orders:", err);
      if (pageNum === 1) {
        setOrders([]);
        setFilteredOrders([]);
      }
    } finally {
      setLoading(false);
      setInitialLoading(false);
      if (refresh) setRefreshing(false);
    }
  }, [user]);

  // Refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      setPage(1);
      setStatusFilter([]); // No default filter - show all orders
      setSortBy("date_desc"); // Default sort by newest to oldest
      fetchOrders(1, true);
    }, [fetchOrders])
  );

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchOrders(1, true);
  };

  // Load more on scroll
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage((prevPage) => {
        const nextPage = prevPage + 1;
        fetchOrders(nextPage);
        return nextPage;
      });
    }
  }, [loading, hasMore, fetchOrders]);

  // Apply search & filter
  useEffect(() => {
    let filtered = [...orders];

    if (searchQuery) {
      filtered = filtered.filter(
        (o) =>
          o.cafeteria_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.concession_name.toLowerCase().includes(searchQuery.toLowerCase()) 
      );
    }

    // Filter by status (normalized)
    if (statusFilter.length > 0) {
      const normalizedSelected = new Set(statusFilter.map((s) => normalizeStatus(s)));
      filtered = filtered.filter((o) => normalizedSelected.has(normalizeStatus(o.order_status)));
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
          filtered.sort((a, b) => a.total_price - b.total_price);
          break;
        case "price_desc":
          filtered.sort((a, b) => b.total_price - a.total_price);
          break;
        case "status":
          filtered.sort((a, b) => a.order_status.localeCompare(b.order_status));
          break;
      }
    }

    setFilteredOrders(filtered);
  }, [searchQuery, statusFilter, sortBy, orders]);

  // If a status filter is applied and no results are visible yet, auto-load more pages
  useEffect(() => {
    if (statusFilter.length > 0 && filteredOrders.length === 0 && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchOrders(nextPage);
    }
  }, [statusFilter, filteredOrders.length, hasMore, loading, page, fetchOrders]);

  const handleConfirmCancelOrder = async () => {
    if (!cancelOrderId) return;

    try {
      setCancelLoading(true);
      await api.put(`/order/cancel/${cancelOrderId}`);
      showToast("success", "Order cancelled successfully");
      setPage(1);
      await fetchOrders(1, true);
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
          <Text>Total: ₱{Number(item.total_price).toFixed(2)}</Text>
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

      {/* Search bar */}
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
        <Text style={styles.filterText}>Filters</Text>
      </TouchableOpacity>

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
          {["pending", "accepted", "ready-for-pickup", "completed", "declined"].map(
            (status) => (
              <TouchableOpacity
                key={status}
                onPress={() => {
                  if (statusFilter.includes(status)) {
                    setStatusFilter(statusFilter.filter(s => s !== status));
                  } else {
                    setStatusFilter([...statusFilter, status]);
                  }
                }}
              >
                <Text style={statusFilter.includes(status) ? styles.active : styles.option}>
                  {status}
                </Text>
              </TouchableOpacity>
            )
          )}

          {/* Sort options */}
          <Text style={styles.label}>Sort by</Text>
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
              <Text style={sortBy === opt.key ? styles.active : styles.option}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Close modal */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                setStatusFilter([]);
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
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  filterBtn: {
    padding: 10,
    backgroundColor: "#A40C2D",
    marginBottom: 15,
    borderRadius: 8,
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
  option: { padding: 8, fontSize: 14 },
  active: {
    padding: 8,
    fontSize: 14,
    backgroundColor: "#A40C2D",
    color: "#fff",
    borderRadius: 6,
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
