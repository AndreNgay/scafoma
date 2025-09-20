import React, { useEffect, useState, useCallback } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  Modal,
  Image
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import api from "../../../libs/apiCall"; 
import useStore from "../../../store";

interface Order {
  id: number;
  order_status: string;
  total_price: number;
  created_at: string;
  first_name: string;
  last_name: string;
  concession_name: string;
}

const OrderList = () => {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string | null>(null); // "date_desc", "date_asc", "price_asc", "price_desc"

  const user = useStore((state: any) => state.user);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/order/concessionare/${user.id}`);
      setOrders(res.data);
      setFilteredOrders(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [user.id])
  );

  // Apply search, filter, and sort
  useEffect(() => {
    let filtered = [...orders];

    // Search by customer, concession, or order ID
    if (searchQuery) {
      filtered = filtered.filter(
        (o) =>
          o.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.concession_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.id.toString().includes(searchQuery)
      );
    }

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((o) => o.order_status === statusFilter);
    }

    // Sort
    if (sortBy) {
      switch (sortBy) {
        case "date_desc":
          filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
        case "date_asc":
          filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          break;
        case "price_asc":
          filtered.sort((a, b) => a.total_price - b.total_price);
          break;
        case "price_desc":
          filtered.sort((a, b) => b.total_price - a.total_price);
          break;
      }
    }

    setFilteredOrders(filtered);
  }, [searchQuery, statusFilter, sortBy, orders]);

const renderOrder = ({ item }: { item: Order }) => (
  <TouchableOpacity
    style={styles.orderCard}
    onPress={() => navigation.navigate("View Order", { orderId: item.id })}
  >
    {/* Avatar */}
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Image
        source={{ uri: "https://static.vecteezy.com/system/resources/previews/006/487/917/non_2x/man-avatar-icon-free-vector.jpg" }}
        style={styles.avatar}
      />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.orderId}>Order #{item.id}</Text>
        <Text style={styles.customer}>
          Customer: {item.first_name} {item.last_name}
        </Text>
        <Text style={styles.concession}>Concession: {item.concession_name}</Text>
        <Text>Status: <Text style={styles.status}>{item.order_status}</Text></Text>
        <Text>Total: ₱{Number(item.total_price).toFixed(2)}</Text>
        <Text>Date: {new Date(item.created_at).toLocaleString()}</Text>
      </View>
    </View>
  </TouchableOpacity>
);


  if (loading) return <ActivityIndicator size="large" color="#A40C2D" style={{ flex: 1 }} />;
  if (error) return <View style={styles.container}><Text style={styles.errorText}>{error}</Text></View>;
  if (!orders.length) return <View style={styles.container}><Text style={styles.emptyText}>No orders found</Text></View>;

  return (
    <View style={styles.container}>
      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by customer, concession, or ID..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Filter button */}
      <TouchableOpacity style={styles.filterBtn} onPress={() => setFiltersVisible(true)}>
        <Text style={styles.filterText}>Filters & Sort</Text>
      </TouchableOpacity>

      {/* Orders list */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrder}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* Filter modal */}
      <Modal visible={filtersVisible} animationType="slide">
        <View style={styles.filterContainer}>
          <Text style={styles.filterHeader}>Filter Orders</Text>

          {/* Status */}
          <Text style={styles.label}>Status</Text>
          {["pending", "accepted", "ready-for-pickup", "completed", "declined"].map((status) => (
            <TouchableOpacity key={status} onPress={() => setStatusFilter(statusFilter === status ? null : status)}>
              <Text style={statusFilter === status ? styles.active : styles.option}>{status}</Text>
            </TouchableOpacity>
          ))}

          {/* Sort */}
          <Text style={styles.label}>Sort by</Text>
          {[
            { key: "date_desc", label: "Date (Newest → Oldest)" },
            { key: "date_asc", label: "Date (Oldest → Newest)" },
            { key: "price_asc", label: "Total Price (Low → High)" },
            { key: "price_desc", label: "Total Price (High → Low)" },
          ].map((opt) => (
            <TouchableOpacity key={opt.key} onPress={() => setSortBy(sortBy === opt.key ? null : opt.key)}>
              <Text style={sortBy === opt.key ? styles.active : styles.option}>{opt.label}</Text>
            </TouchableOpacity>
          ))}

          {/* Close */}
          <TouchableOpacity style={styles.applyBtn} onPress={() => setFiltersVisible(false)}>
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#fff" },
  searchInput: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: "#fff" },
  filterBtn: { padding: 10, backgroundColor: "#A40C2D", marginBottom: 15, borderRadius: 8 },
  filterText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  orderCard: { backgroundColor: "#f9f9f9", padding: 15, borderRadius: 10, marginBottom: 10 },
  orderId: { fontWeight: "bold", fontSize: 16, color: "#A40C2D" },
  customer: { fontSize: 14, marginTop: 4 },
  concession: { fontSize: 14, marginTop: 2 },
  status: { fontWeight: "600", color: "#A40C2D" },
  emptyText: { textAlign: "center", color: "#888", marginTop: 20 },
  errorText: { textAlign: "center", color: "red", marginTop: 20 },
  filterContainer: { flex: 1, padding: 20, backgroundColor: "#fff" },
  filterHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  label: { marginTop: 15, fontWeight: "600" },
  option: { padding: 8, fontSize: 14 },
  active: { padding: 8, fontSize: 14, backgroundColor: "#A40C2D", color: "#fff", borderRadius: 6 },
  applyBtn: { backgroundColor: "#A40C2D", padding: 12, borderRadius: 8, marginTop: 20 },
  applyText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  avatar: {
  width: 50,
  height: 50,
  borderRadius: 25,
  backgroundColor: "#ddd",
},

});

export default OrderList;
