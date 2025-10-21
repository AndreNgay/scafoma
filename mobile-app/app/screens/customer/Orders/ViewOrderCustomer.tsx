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
} from "react-native";
import { useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import api from "../../../libs/apiCall";

const ViewOrderCustomer = () => {
  const route = useRoute<any>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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
      <Text>Date: {formatDateTime(order.created_at)}</Text>

      <View style={{ marginTop: 15 }}>
        <Text style={styles.paymentLabel}>Payment Method</Text>
        <Text style={styles.paymentMethodDisplay}>
          {order.payment_method === "gcash" ? "💳 GCash" : "💰 On-Counter"}
        </Text>
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
                ✅ Screenshot uploaded successfully
              </Text>
            </View>
          ) : (
            <Text style={{ color: "#888", marginBottom: 10 }}>
              No screenshot uploaded
            </Text>
          )}
          
          {order.order_status === "accepted" ? (
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
                  : order.order_status === "ready for pickup"
                  ? "✅ Order is ready for pickup. Payment proof already processed."
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
  uploadBtn: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  paymentLabel: { fontWeight: "600", color: "#A40C2D", marginBottom: 5 },
  paymentMethodDisplay: { 
    fontSize: 16, 
    fontWeight: "500", 
    color: "#333", 
    backgroundColor: "#f9f9f9", 
    padding: 12, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd"
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
});

export default ViewOrderCustomer;
