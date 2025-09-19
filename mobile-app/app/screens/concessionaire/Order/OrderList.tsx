import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator 
} from "react-native";
import { useNavigation } from "@react-navigation/native";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Call the hook at the top level
  const user = useStore((state: any) => state.user);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/order/concessionare/${user.id}`);
      setOrders(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user.id]);

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate("View Order", { orderId: item.id })}
    >
      <Text style={styles.orderId}>Order #{item.id}</Text>
      <Text style={styles.customer}>
        Customer: {item.first_name} {item.last_name}
      </Text>

      <Text style={styles.concession}>Concession: {item.concession_name}</Text>
      <Text>Status: <Text style={styles.status}>{item.order_status}</Text></Text>
      <Text>Total: ₱{Number(item.total_price).toFixed(2)}</Text>
      <Text>Date: {new Date(item.created_at).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  if (loading) return <ActivityIndicator size="large" color="#A40C2D" style={{ flex: 1 }} />;

  if (error) return (
    <View style={styles.container}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );

  if (!orders.length) return (
    <View style={styles.container}>
      <Text style={styles.emptyText}>No orders found</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrder}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#fff" },
  orderCard: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  orderId: { fontWeight: "bold", fontSize: 16, color: "#A40C2D" },
  customer: { fontSize: 14, marginTop: 4 },
  concession: { fontSize: 14, marginTop: 2 },
  status: { fontWeight: "600", color: "#A40C2D" },
  emptyText: { textAlign: "center", color: "#888", marginTop: 20 },
  errorText: { textAlign: "center", color: "red", marginTop: 20 },
});

export default OrderList;
