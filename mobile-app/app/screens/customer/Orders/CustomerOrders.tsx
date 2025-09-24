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
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

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
    if (statusFilter) {
      filtered = filtered.filter((o) => o.order_status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [searchQuery, statusFilter, orders]);

const renderItem = ({ item }: any) => (
<TouchableOpacity
  onPress={() => navigation.navigate("View Order", { orderId: item.id })}
>

    <View style={styles.card}>
      {/* ✅ Order ID */}
      <Text style={styles.orderId}>Order #{item.id}</Text>

      <Text style={styles.title}>
        {item.cafeteria_name} • {item.concession_name}
      </Text>
      <Text>
        Status: <Text style={styles.status}>{item.order_status}</Text>
      </Text>
      <Text>Total: ₱{Number(item.total_price).toFixed(2)}</Text>
      <Text style={styles.date}>
        {new Date(item.created_at).toLocaleString()}
      </Text>
    </View>
  </TouchableOpacity>
);


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
          <Text style={styles.filterHeader}>Filter Orders</Text>

          {/* Status filter */}
          <Text style={styles.label}>Status</Text>
          {["pending", "accepted", "ready-for-pickup", "completed", "declined"].map(
            (status) => (
              <TouchableOpacity
                key={status}
                onPress={() =>
                  setStatusFilter(statusFilter === status ? null : status)
                }
              >
                <Text style={statusFilter === status ? styles.active : styles.option}>
                  {status}
                </Text>
              </TouchableOpacity>
            )
          )}

          {/* Close modal */}
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => setFiltersVisible(false)}
          >
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
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
  filterHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  label: { marginTop: 15, fontWeight: "600" },
  option: { padding: 8, fontSize: 14 },
  active: {
    padding: 8,
    fontSize: 14,
    backgroundColor: "#A40C2D",
    color: "#fff",
    borderRadius: 6,
  },
  applyBtn: {
    backgroundColor: "#A40C2D",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  applyText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  orderId: {
  fontSize: 13,
  fontWeight: "600",
  color: "#555",
  marginBottom: 3,
},

});

export default CustomerOrders;
