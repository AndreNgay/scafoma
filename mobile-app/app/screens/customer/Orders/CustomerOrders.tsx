import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import useStore from "../../../store";
import api from "../../../libs/apiCall"; // axios instance
import { TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

const CustomerOrders = () => {
    const navigation = useNavigation<any>();
  const user = useStore((state: any) => state.user);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.get(`/order/customer/${user.id}`);
      setOrders(res.data || []);
    } catch (err) {
      console.error("Error fetching customer orders:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Refresh every time screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [user?.id])
  );

    const renderItem = ({ item }: any) => (
    <TouchableOpacity
        onPress={() => navigation.navigate("View Order", { orderId: item.id })}
    >
        <View style={styles.card}>
        <Text style={styles.title}>
            {item.cafeteria_name} • {item.concession_name}
        </Text>
        <Text>
            Status: <Text style={styles.status}>{item.order_status}</Text>
        </Text>
        <Text>Total: ₱{Number(item.total_price).toFixed(2)}</Text>
        {item.note ? <Text>Note: {item.note}</Text> : null}
        <Text style={styles.date}>
            {new Date(item.created_at).toLocaleString()}
        </Text>
        {item.payment_proof ? (
            <Image
            source={{ uri: item.payment_proof }}
            style={styles.paymentProof}
            />
        ) : null}
        </View>
    </TouchableOpacity>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Orders</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#A40C2D" />
      ) : orders.length === 0 ? (
        <Text style={styles.emptyText}>No orders yet</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 15 },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#A40C2D",
  },
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
  paymentProof: { marginTop: 10, width: 120, height: 120, borderRadius: 8 },
  emptyText: { textAlign: "center", marginTop: 20, color: "#888" },
});

export default CustomerOrders;
