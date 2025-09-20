import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Image, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRoute } from "@react-navigation/native";
import api from "../../../libs/apiCall";

const ViewOrderConcessionaire = () => {
  const route = useRoute<any>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/order-detail/${orderId}`);
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

  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    try {
      setUpdatingStatus(true);
      await api.put(`/order/status/${order.id}`, { order_status: newStatus });
      await fetchOrderDetails(); // <-- refetch full order with items
      Alert.alert("Success", `Order marked as ${newStatus}`);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to update order status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#A40C2D" style={{ flex: 1 }} />;
  if (!order) return <View style={styles.container}><Text style={styles.emptyText}>Order not found</Text></View>;

  // Determine what buttons to show based on current order_status
const renderStatusButtons = () => {
  if (updatingStatus) return <Text>Updating...</Text>;

  switch (order.order_status) {
    case "pending":
      return (
        <View style={{ flexDirection: "row", marginTop: 10 }}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => updateStatus("accepted")}>
            <Text style={styles.btnText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} onPress={() => updateStatus("declined")}>
            <Text style={styles.btnText}>Decline</Text>
          </TouchableOpacity>
        </View>
      );

case "accepted":
  return (
    <View style={{ flexDirection: "row", marginTop: 10 }}>
      <TouchableOpacity
        style={styles.readyBtn}
        onPress={() => updateStatus("ready for pickup")} // <-- space, not dash
      >
        <Text style={styles.btnText}>Ready for Pick-up</Text>
      </TouchableOpacity>
    </View>
  );

case "ready for pickup":
  return (
    <View style={{ flexDirection: "row", marginTop: 10 }}>
      <TouchableOpacity style={styles.completeBtn} onPress={() => updateStatus("completed")}>
        <Text style={styles.btnText}>Complete</Text>
      </TouchableOpacity>
    </View>
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
      <Text>Status: <Text style={styles.status}>{order.order_status}</Text></Text>
      <Text>Total: ₱{Number(order.total_price).toFixed(2)}</Text>

      {order.payment_method && (
        <Text>Payment Method: {order.payment_method === "gcash" ? "GCash" : "On-Counter"}</Text>
      )}

      {order.note ? <Text>Note: {String(order.note)}</Text> : null}
      <Text>Date: {new Date(order.created_at).toLocaleString()}</Text>

      {order.payment_proof && (
        <Image source={{ uri: order.payment_proof }} style={styles.paymentProof} />
      )}

      {/* Render action buttons */}
      {renderStatusButtons()}

      <Text style={styles.sectionHeader}>Items</Text>
      <FlatList
        data={order.items || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text style={styles.itemName}>{item.item_name} x{item.quantity}</Text>
            <Text>₱{Number(item.total_price).toFixed(2)}</Text>
            {item.note && <Text style={styles.note}>Note: {item.note}</Text>}
            {item.variations && item.variations.length > 0 && (
              <View style={{ marginTop: 5 }}>
                {item.variations.map((v: any) => (
                  <Text key={v.id} style={styles.variation}>• {String(v.variation_name)} (+₱{Number(v.additional_price || 0).toFixed(2)})</Text>
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
  note: { fontSize: 13, color: "#555", fontStyle: "italic", marginTop: 2 },
  acceptBtn: { flex: 1, backgroundColor: "green", padding: 10, borderRadius: 8, marginRight: 5, alignItems: "center" },
  declineBtn: { flex: 1, backgroundColor: "red", padding: 10, borderRadius: 8, marginLeft: 5, alignItems: "center" },
  readyBtn: { flex: 1, backgroundColor: "orange", padding: 10, borderRadius: 8, marginRight: 5, alignItems: "center" },
  completeBtn: { flex: 1, backgroundColor: "#A40C2D", padding: 10, borderRadius: 8, marginLeft: 5, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" }
});

export default ViewOrderConcessionaire;
