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
import { Picker } from "@react-native-picker/picker";
import { useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import api from "../../../libs/apiCall";

const ViewOrderCustomer = () => {
  const route = useRoute<any>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [uploading, setUploading] = useState(false);

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
  // Change payment method
  // ===============================
  const handlePaymentChange = async (newMethod: "gcash" | "on-counter") => {
    if (!order) return;
    try {
      setUpdatingPayment(true);
      const res = await api.patch(`/order/${order.id}/payment-method`, {
        payment_method: newMethod,
      });

      setOrder((prev: any) => ({
        ...prev,
        payment_method: res.data.payment_method,
        // reset payment proof if switched to On-Counter
        payment_proof: newMethod === "gcash" ? prev.payment_proof || null : null,
      }));
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to update payment method");
    } finally {
      setUpdatingPayment(false);
    }
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
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to upload screenshot");
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

  const paymentOptions = [];
  if (order.oncounter_payment_available)
    paymentOptions.push({ label: "On-Counter", value: "on-counter" });
  if (order.gcash_payment_available) paymentOptions.push({ label: "GCash", value: "gcash" });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Order #{order.id}</Text>
      <Text>
        Status: <Text style={styles.status}>{order.order_status}</Text>
      </Text>
      <Text>Total: ₱{Number(order.total_price).toFixed(2)}</Text>
      {order.note && <Text>Note: {order.note}</Text>}
      <Text>Date: {new Date(order.created_at).toLocaleString()}</Text>

      {paymentOptions.length > 0 && (
        <View style={{ marginTop: 15 }}>
          <Text style={styles.paymentLabel}>Payment Method</Text>
          <Picker
            selectedValue={order.payment_method || paymentOptions[0].value}
            onValueChange={(val: string) =>
              handlePaymentChange(val as "gcash" | "on-counter")
            }
            enabled={!updatingPayment}
          >
            {paymentOptions.map((opt) => (
              <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </Picker>
        </View>
      )}

      {order.payment_method === "gcash" ? (
        <View style={{ marginTop: 15 }}>
          <Text style={styles.paymentLabel}>GCash Screenshot (Required)</Text>
          {order.payment_proof ? (
            <Image source={{ uri: order.payment_proof }} style={styles.paymentProof} />
          ) : (
            <Text style={{ color: "#888", marginBottom: 10 }}>
              No screenshot uploaded
            </Text>
          )}
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={pickImage}
            disabled={uploading}
          >
            <Text>
              {uploading
                ? "Uploading..."
                : order.payment_proof
                ? "Change Screenshot"
                : "Upload Screenshot"}
            </Text>
          </TouchableOpacity>
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
});

export default ViewOrderCustomer;
