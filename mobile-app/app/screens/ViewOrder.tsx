import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Image, ScrollView } from "react-native";
import { useRoute } from "@react-navigation/native";
import api from "../libs/apiCall";

const ViewOrder = () => {
  const route = useRoute<any>();
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/order-detail/${orderId}`);
      setOrder(res.data);
    } catch (err) {
      console.error("Error fetching order details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  if (loading) {
    return <ActivityIndicator size="large" color="#A40C2D" style={{ flex: 1 }} />;
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Order not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Order #{order.id}</Text>
      <Text>Status: <Text style={styles.status}>{order.order_status}</Text></Text>
      <Text>Total: ₱{Number(order.total_price).toFixed(2)}</Text>
      {order.note ? <Text>Note: {order.note}</Text> : null}
      <Text>Date: {new Date(order.created_at).toLocaleString()}</Text>

      {order.payment_proof && (
        <Image source={{ uri: order.payment_proof }} style={styles.paymentProof} />
      )}

      <Text style={styles.sectionHeader}>Items</Text>
      <FlatList
        data={order.items || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text style={styles.itemName}>
              {item.item_name} x{item.quantity}
            </Text>
            <Text>₱{Number(item.total_price).toFixed(2)}</Text>
            {item.note ? <Text>Note: {item.note}</Text> : null}

            {item.variations && item.variations.length > 0 && (
              <View style={{ marginTop: 5 }}>
                {item.variations.map((v: any) => (
                  <Text key={v.id} style={styles.variation}>
                    • {v.variation_name} (+₱{v.additional_price})
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
        scrollEnabled={false}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#fff" },
  header: { fontSize: 20, fontWeight: "bold", marginBottom: 10, color: "#A40C2D" },
  status: { fontWeight: "600", color: "#A40C2D" },
  sectionHeader: { fontSize: 18, fontWeight: "600", marginTop: 20, marginBottom: 10 },
  itemCard: { backgroundColor: "#f9f9f9", padding: 10, borderRadius: 8, marginBottom: 8 },
  itemName: { fontWeight: "600" },
  variation: { fontSize: 13, color: "#444" },
  paymentProof: { marginTop: 15, width: "100%", height: 200, borderRadius: 10 },
  emptyText: { textAlign: "center", color: "#888", marginTop: 20 },
});

export default ViewOrder;
