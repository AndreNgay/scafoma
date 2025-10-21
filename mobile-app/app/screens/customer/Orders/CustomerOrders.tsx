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
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import useStore from "../../../store";
import api from "../../../libs/apiCall";

const CustomerOrders = () => {
  const navigation = useNavigation<any>();
  const user = useStore((state: any) => state.user);
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("date_desc");

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

  // Fetch customer orders
  const fetchOrders = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.get(`/order/customer/${user.id}`);
      setOrders(res.data || []);
      setFilteredOrders(res.data || []);
    } catch (err) {
      console.error("Error fetching customer orders:", err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      setStatusFilter([]); // No default filter - show all orders
      setSortBy("date_desc"); // Default sort by newest to oldest
      fetchOrders();
    }, [user?.id])
  );

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

    // Filter by status
    if (statusFilter.length > 0) {
      filtered = filtered.filter((o) => statusFilter.includes(o.order_status));
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

const renderItem = ({ item }: any) => {
  const cancelOrder = async () => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order? This action cannot be undone.",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await api.put(`/order/cancel/${item.id}`);
              Alert.alert("Success", "Order cancelled successfully");
              // Refresh the orders list
              fetchOrders();
            } catch (error: any) {
              console.error("Error cancelling order:", error);
              Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to cancel order. Please try again."
              );
            }
          },
        },
      ]
    );
  };

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
        <Text>
          Status: <Text style={styles.status}>{item.order_status}</Text>
        </Text>
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
      {loading ? (
        <ActivityIndicator size="large" color="#A40C2D" />
      ) : filteredOrders.length === 0 ? (
        <Text style={styles.emptyText}>No orders found</Text>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
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

});

export default CustomerOrders;
