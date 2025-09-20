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
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useRoute } from "@react-navigation/native";
import * as ImagePicker from "react-native-image-picker";


import api from "../../../libs/apiCall";

const ViewOrderCustomer = () => {
  const route = useRoute<any>();
  const { item } = route.params;

  const [order, setOrder] = useState<any>(item || null);
  const [loading, setLoading] = useState(!item);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localProof, setLocalProof] = useState<any>(null); // local image before upload

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!item?.id) return;
      try {
        setLoading(true);
        const res = await api.get(`/order-detail/${item.id}`);
        setOrder({
          ...res.data,
          gcash_payment_available: res.data.gcash_payment_available ?? true,
          oncounter_payment_available: res.data.oncounter_payment_available ?? true,
        });
      } catch (err) {
        console.error("Error fetching order details:", err);
        Alert.alert("Error", "Failed to fetch order details");
      } finally {
        setLoading(false);
      }
    };

    if (!item?.items) fetchOrderDetails();
  }, [item]);

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
      }));
    } catch (err: any) {
      console.error(err.response?.data || err);
      Alert.alert("Error", "Failed to update payment method");
    } finally {
      setUpdatingPayment(false);
    }
  };

  const pickImage = async () => {
    ImagePicker.launchImageLibrary(
      { mediaType: "photo", quality: 0.8 },
      async (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert("Error", response.errorMessage || "Failed to pick image");
          return;
        }

        const asset = response.assets?.[0];
        if (!asset) return;

        setLocalProof(asset.uri);
        await uploadPaymentProof(asset);
      }
    );
  };

  const uploadPaymentProof = async (image: any) => {
    if (!order) return;
    const data = new FormData();
    data.append("file", {
      uri: image.uri,
      name: `gcash_${order.id}.jpg`,
      type: "image/jpeg",
    } as any);

    try {
      setUploading(true);
      const res = await api.patch(`/order/${order.id}/payment-proof`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setOrder((prev: any) => ({ ...prev, payment_proof: res.data.payment_proof }));
      Alert.alert("Success", "GCash screenshot uploaded!");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to upload screenshot");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#A40C2D" style={{ flex: 1 }} />;
  if (!order)
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Order not found</Text>
      </View>
    );

  const paymentOptions = [];
  if (order.oncounter_payment_available) paymentOptions.push({ label: "On-Counter", value: "on-counter" });
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

      {/* Payment Method */}
      {paymentOptions.length > 0 && (
        <View style={{ marginTop: 15 }}>
          <Text style={{ fontWeight: "600", color: "#A40C2D", marginBottom: 5 }}>Payment Method</Text>
          <Picker
            selectedValue={order.payment_method || paymentOptions[0].value}
            onValueChange={(val: string) => handlePaymentChange(val as "gcash" | "on-counter")}
            enabled={!updatingPayment}
          >
            {paymentOptions.map((opt) => (
              <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </Picker>
        </View>
      )}

      {/* GCash Screenshot */}
      {order.payment_method === "gcash" && (
        <View style={{ marginTop: 15 }}>
          <Text style={{ fontWeight: "600", color: "#A40C2D", marginBottom: 5 }}>GCash Screenshot (Required)</Text>
          {order.payment_proof || localProof ? (
            <Image
              source={{ uri: localProof || order.payment_proof }}
              style={styles.paymentProof}
            />
          ) : (
            <TouchableOpacity
              style={{
                backgroundColor: "#f9f9f9",
                padding: 15,
                borderRadius: 10,
                alignItems: "center",
              }}
              onPress={pickImage}
            >
              <Text>{uploading ? "Uploading..." : "Upload Screenshot"}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {order.payment_method === "on-counter" && (
        <View style={{ marginTop: 15 }}>
          <Text style={{ fontWeight: "600", color: "#A40C2D", marginBottom: 5 }}>GCash Screenshot (Optional)</Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#f9f9f9",
              padding: 15,
              borderRadius: 10,
              alignItems: "center",
            }}
            onPress={pickImage}
          >
            <Text>{uploading ? "Uploading..." : localProof || order.payment_proof ? "Change Screenshot" : "Upload Screenshot"}</Text>
          </TouchableOpacity>
          {order.payment_proof && <Image source={{ uri: order.payment_proof }} style={styles.paymentProof} />}
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
});

export default ViewOrderCustomer;
