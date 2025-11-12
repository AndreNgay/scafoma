import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
  BackHandler,
} from "react-native";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import api from "../../../libs/apiCall";

const ViewOrderCustomer = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);

  const formatManila = (value: any) => {
    if (!value) return "";
    try {
      if (typeof value === "string") {
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

  // ===============================
  // Fetch order by ID
  // ===============================
  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/order/${orderId}`);
      const data = res.data;

      // Normalize payment proof URL for frontend
      data.payment_proof = data.payment_proof || data.gcash_screenshot || null;

      setOrder(data);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to fetch order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }
        navigation.navigate('Orders', { screen: 'Customer Orders' });
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [navigation])
  );

  // ===============================
  // Cancel order
  // ===============================
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
              setCancelling(true);
              const res = await api.put(`/order/cancel/${orderId}`);
              Alert.alert("Success", "Order cancelled successfully");
              // Refresh the order data
              await fetchOrder();
            } catch (error: any) {
              console.error("Error cancelling order:", error);
              Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to cancel order. Please try again."
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };


  // ===============================
  // Pick and upload GCash screenshot
  // ===============================
  const pickImage = async () => {
    if (!order) return;

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "Please allow access to your photos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) return;

      await uploadPaymentProof(asset.uri);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadPaymentProof = async (uri: string) => {
    if (!order) return;

    const formData = new FormData();
    formData.append("gcash_screenshot", {
      uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
      name: `gcash_${order.id}.jpg`,
      type: "image/jpeg",
    } as any);

    try {
      setUploading(true);
      const res = await api.put(`/order/gcash-screenshot/${order.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setOrder((prev: any) => ({
        ...prev,
        payment_proof: res.data.payment_proof || res.data.gcash_screenshot,
      }));
      Alert.alert("Success", "GCash screenshot uploaded!");
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.response?.data?.error || "Failed to upload screenshot";
      Alert.alert("Error", errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // ===============================
  // Change payment method
  // ===============================
  const changePaymentMethod = async (method: 'gcash' | 'on-counter') => {
    if (!order) return;
    if (order.payment_method === method) return;
    // Only allow change when order is pending
    if (order.order_status !== 'pending') {
      return Alert.alert('Not Allowed', 'Payment method can only be changed while the order is pending.');
    }
    // Guard against unavailable methods
    if (method === 'gcash' && !order.gcash_payment_available) return;
    if (method === 'on-counter' && !order.oncounter_payment_available) return;

    try {
      setUpdatingPayment(true);
      await api.patch(`/order/${order.id}/payment-method`, { payment_method: method });
      await fetchOrder();
    } catch (err: any) {
      console.error('Error updating payment method:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to update payment method');
    } finally {
      setUpdatingPayment(false);
    }
  };

  // ===============================
  // Render
  // ===============================
  if (loading)
    return <ActivityIndicator size="large" color="#A40C2D" style={{ flex: 1 }} />;

  if (!order)
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Order not found</Text>
      </View>
    );


  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Order #{order.id}</Text>
      <Text>
        Status: <Text style={styles.status}>{order.order_status}</Text>
      </Text>
      <Text>Total: ₱{Number(order.total_price).toFixed(2)}</Text>
      {order.note && <Text>Note: {order.note}</Text>}
      {order.schedule_time && (
        <Text style={styles.scheduleTime}>
          📅 Scheduled for: {formatSchedule(order.schedule_time)}
        </Text>
      )}
      
      {/* Decline Reason */}
      {order.order_status === "declined" && order.decline_reason && (
        <View style={styles.declineReasonContainer}>
          <Text style={styles.declineReasonLabel}>Decline Reason:</Text>
          <Text style={styles.declineReasonText}>{order.decline_reason}</Text>
        </View>
      )}
      
      <Text>Date: {formatDateTime(order.created_at)}</Text>

      <View style={{ marginTop: 15 }}>
        <Text style={styles.paymentLabel}>Payment Method</Text>
        <View style={styles.paymentMethodButtons}>
          {/* GCash option */}
          <TouchableOpacity
            style={[
              styles.paymentMethodButton,
              order.payment_method === 'gcash' && styles.paymentMethodSelected,
              !order.gcash_payment_available && styles.paymentMethodDisabled,
            ]}
            disabled={!order.gcash_payment_available || updatingPayment}
            onPress={() => changePaymentMethod('gcash')}
          >
            <Text
              style={[
                styles.paymentMethodText,
                order.payment_method === 'gcash' && styles.paymentMethodTextSelected,
                !order.gcash_payment_available && styles.paymentMethodTextDisabled,
              ]}
            >
              💳 GCash {(!order.gcash_payment_available) ? '(Unavailable)' : ''}
            </Text>
          </TouchableOpacity>

          {/* On-Counter option */}
          <TouchableOpacity
            style={[
              styles.paymentMethodButton,
              order.payment_method === 'on-counter' && styles.paymentMethodSelected,
              !order.oncounter_payment_available && styles.paymentMethodDisabled,
            ]}
            disabled={!order.oncounter_payment_available || updatingPayment}
            onPress={() => changePaymentMethod('on-counter')}
          >
            <Text
              style={[
                styles.paymentMethodText,
                order.payment_method === 'on-counter' && styles.paymentMethodTextSelected,
                !order.oncounter_payment_available && styles.paymentMethodTextDisabled,
              ]}
            >
              💰 On-Counter {(!order.oncounter_payment_available) ? '(Unavailable)' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {order.payment_method === "gcash" ? (
        <View style={{ marginTop: 15 }}>
          <Text style={styles.paymentLabel}>
            GCash Screenshot {order.payment_proof ? "(Uploaded)" : "(Required)"}
          </Text>
          {order.payment_proof ? (
            <View>
              <Image source={{ uri: order.payment_proof }} style={styles.paymentProof} />
              <Text style={styles.uploadedIndicator}>
                Screenshot uploaded successfully
              </Text>
            </View>
          ) : (
            <Text style={{ color: "#888", marginBottom: 10 }}>
              No screenshot uploaded
            </Text>
          )}
          
          {(order.order_status === "accepted" || order.order_status === "ready for pickup") ? (
            order.payment_proof ? (
              <View style={styles.uploadDisabledContainer}>
                <Text style={styles.uploadDisabledText}>
                  ✅ GCash screenshot uploaded successfully. Screenshot cannot be changed once uploaded.
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={pickImage}
                disabled={uploading}
              >
                <Text>
                  {uploading ? "Uploading..." : "Upload Screenshot"}
                </Text>
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.uploadDisabledContainer}>
              <Text style={styles.uploadDisabledText}>
                {order.order_status === "pending"
                  ? "⏳ Please wait for your order to be accepted before uploading payment proof."
                  : order.order_status === "declined"
                  ? "❌ This order has been declined. No payment proof needed."
                  : order.order_status === "completed"
                  ? "✅ Order completed. Payment proof already processed."
                  : "⏳ Please wait for your order to be accepted before uploading payment proof."
                }
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={{ marginTop: 15 }}>
          <Text style={{ color: "#888", fontStyle: "italic" }}>
            You chose On-Counter payment. No screenshot required.
          </Text>
        </View>
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
            {item.note && <Text>Note: {item.note}</Text>}
            {item.variations?.length > 0 && (
              <View style={{ marginTop: 5 }}>
                {item.variations.map((v: any) => (
                  <Text key={v.id} style={styles.variation}>
                    • {v.variation_group_name}: {v.variation_name}
                    {v.quantity > 1 ? ` x${v.quantity}` : ''}
                    {' '}(+₱{Number(v.additional_price || 0).toFixed(2)})
                    {v.quantity > 1 ? ` = ₱${(Number(v.additional_price || 0) * (v.quantity || 1)).toFixed(2)}` : ''}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
        scrollEnabled={false}
      />

      {/* Cancel Order Button - Only show for pending orders */}
      {order.order_status === 'pending' && (
        <View style={styles.cancelButtonContainer}>
          <TouchableOpacity
            style={[styles.cancelButton, cancelling && styles.cancelButtonDisabled]}
            onPress={cancelOrder}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  uploadBtn: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  paymentLabel: { fontWeight: "600", color: "#A40C2D", marginBottom: 5 },
  paymentMethodButtons: { flexDirection: "row", gap: 10 },
  paymentMethodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
    alignItems: "center",
  },
  paymentMethodSelected: {
    borderColor: "#A40C2D",
    backgroundColor: "#A40C2D22",
  },
  paymentMethodDisabled: {
    opacity: 0.5,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  paymentMethodTextSelected: {
    color: "#A40C2D",
    fontWeight: "600",
  },
  paymentMethodTextDisabled: {
    color: "#999",
  },
  uploadDisabledContainer: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginTop: 10,
  },
  uploadDisabledText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  uploadedIndicator: {
    fontSize: 12,
    color: "#28a745",
    textAlign: "center",
    marginTop: 8,
    fontWeight: "500",
  },
  scheduleTime: {
    fontSize: 14,
    color: "#28a745",
    fontWeight: "500",
    marginTop: 5,
    backgroundColor: "#e8f5e8",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#28a745",
  },
  declineReasonContainer: {
    backgroundColor: "#ffe6e6",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#dc3545",
  },
  declineReasonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#dc3545",
    marginBottom: 5,
  },
  declineReasonText: {
    fontSize: 13,
    color: "#666",
    fontStyle: "italic",
  },
  cancelButtonContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  cancelButton: {
    backgroundColor: "#d32f2f",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonDisabled: {
    backgroundColor: "#ccc",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ViewOrderCustomer;
