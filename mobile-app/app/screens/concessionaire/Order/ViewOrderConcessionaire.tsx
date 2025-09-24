import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import api from "../../../libs/apiCall";

const ViewOrderConcessionaire = () => {
  const route = useRoute<any>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Fetch order details from backend
  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/order/${orderId}`); // Backend route /order/:id
      setOrder(res.data);
    } catch (err) {
      console.error("Error fetching order details:", err);
      Alert.alert("Error", "Failed to fetch order details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  // Update order status
  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    try {
      setUpdatingStatus(true);
      await api.put(`order/status/${order.id}`, { order_status: newStatus });
      await fetchOrderDetails();
      Alert.alert("Success", `Order marked as ${newStatus}`);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to update order status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading)
    return <ActivityIndicator size="large" color="#A40C2D" style={{ flex: 1 }} />;

  if (!order)
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Order not found</Text>
      </View>
    );

  // Render buttons depending on order status
  const renderStatusButtons = () => {
    if (updatingStatus) return <Text>Updating...</Text>;

    switch (order.order_status) {
      case "pending":
        return (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => updateStatus("accepted")}
            >
              <Text style={styles.btnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => updateStatus("declined")}
            >
              <Text style={styles.btnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        );
      case "accepted":
        return (
          <TouchableOpacity
            style={styles.readyBtn}
            onPress={() => updateStatus("ready for pickup")}
          >
            <Text style={styles.btnText}>Ready for Pick-up</Text>
          </TouchableOpacity>
        );
      case "ready for pickup":
        return (
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={() => updateStatus("completed")}
          >
            <Text style={styles.btnText}>Complete</Text>
          </TouchableOpacity>
        );
      case "declined":
      case "completed":
        return <Text style={{ marginTop: 10, fontStyle: "italic" }}>No further actions available</Text>;
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Order #{order.id}</Text>
      <Text>
        Status: <Text style={styles.status}>{order.order_status}</Text>
      </Text>
      <Text>Total: ₱{Number(order.total_price).toFixed(2)}</Text>
      {order.payment_method && (
        <Text>Payment Method: {order.payment_method === "gcash" ? "GCash" : "On-Counter"}</Text>
      )}

      {/* GCash screenshot */}
      {order.gcash_screenshot && (
        <>
          <Text style={styles.sectionHeader}>GCash Screenshot:</Text>
          <Image source={{ uri: order.gcash_screenshot }} style={styles.paymentProof} />
        </>
      )}



      {order.note && <Text>Note: {order.note}</Text>}
      <Text>Date: {new Date(order.created_at).toLocaleString()}</Text>

      {renderStatusButtons()}

      {/* Order items */}
      <Text style={styles.sectionHeader}>Items</Text>
      <FlatList
        data={order.items || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text style={styles.itemName}>{item.item_name} x{item.quantity}</Text>
            <Text>₱{Number(item.total_price).toFixed(2)}</Text>
            {item.note && <Text style={styles.note}>Note: {item.note}</Text>}
            {item.variations?.length > 0 && (
              <View style={{ marginTop: 5 }}>
                {item.variations.map((v: any) => (
                  <Text key={v.id} style={styles.variation}>
                    • {v.variation_name} (+₱{Number(v.additional_price || 0).toFixed(2)})
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
  sectionHeader: { fontSize: 16, fontWeight: "600", marginTop: 10 },
  itemCard: { backgroundColor: "#f9f9f9", padding: 10, borderRadius: 8, marginBottom: 8 },
  itemName: { fontWeight: "600" },
  variation: { fontSize: 13, color: "#444" },
  paymentProof: { marginTop: 5, width: "100%", height: 200, borderRadius: 10 },
  emptyText: { textAlign: "center", color: "#888", marginTop: 20 },
  note: { fontSize: 13, color: "#555", fontStyle: "italic", marginTop: 2 },
  buttonRow: { flexDirection: "row", marginTop: 10 },
  acceptBtn: { flex: 1, backgroundColor: "green", padding: 10, borderRadius: 8, marginRight: 5, alignItems: "center" },
  declineBtn: { flex: 1, backgroundColor: "red", padding: 10, borderRadius: 8, marginLeft: 5, alignItems: "center" },
  readyBtn: { flex: 1, backgroundColor: "orange", padding: 10, borderRadius: 8, marginTop: 10, alignItems: "center" },
  completeBtn: { flex: 1, backgroundColor: "#A40C2D", padding: 10, borderRadius: 8, marginTop: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
});

export default ViewOrderConcessionaire;
