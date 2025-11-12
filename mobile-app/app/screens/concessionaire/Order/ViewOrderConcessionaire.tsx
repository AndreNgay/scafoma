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
  Modal,
  TextInput,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import api from "../../../libs/apiCall";

const ViewOrderConcessionaire = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");

  // Format dates with Asia/Manila timezone
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
  const updateStatus = async (newStatus: string, declineReason?: string) => {
    if (!order) return;
    try {
      setUpdatingStatus(true);
      const requestData: any = { order_status: newStatus };
      if (declineReason) {
        requestData.decline_reason = declineReason;
      }
      await api.put(`order/status/${order.id}`, requestData);
      await fetchOrderDetails();
      Alert.alert("Success", `Order marked as ${newStatus}`);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to update order status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle decline with reason
  const handleDecline = () => {
    setDeclineModalVisible(true);
  };

  // Submit decline with reason
  const submitDecline = async () => {
    if (!selectedReason && !customReason.trim()) {
      Alert.alert("Error", "Please select a reason or provide a custom reason for declining this order.");
      return;
    }

    const reason = selectedReason === "custom" ? customReason.trim() : selectedReason;
    await updateStatus("declined", reason);
    setDeclineModalVisible(false);
    setSelectedReason("");
    setCustomReason("");
  };

  // Cancel decline
  const cancelDecline = () => {
    setDeclineModalVisible(false);
    setSelectedReason("");
    setCustomReason("");
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
              onPress={handleDecline}
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
      {/* Customer Info Section */}
      <TouchableOpacity 
        style={styles.customerSection}
        onPress={() => navigation.navigate("View Customer Profile", { customerId: order.customer_id })}
      >
        {order.profile_image ? (
          <Image source={{ uri: order.profile_image }} style={styles.customerAvatar} />
        ) : (
          <View style={styles.customerAvatarPlaceholder}>
            <Text style={styles.customerInitials}>
              {order.first_name?.[0]}{order.last_name?.[0]}
            </Text>
          </View>
        )}
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>
            {order.first_name} {order.last_name}
          </Text>
          <Text style={styles.customerEmail}>{order.email}</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.header}>Order #{order.id}</Text>
      
      {/* Order Status */}
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Status:</Text>
        <Text style={[styles.status, styles.statusText]}>{order.order_status}</Text>
      </View>

      {/* Total Price */}
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Total:</Text>
        <Text style={styles.infoValue}>₱{Number(order.total_price).toFixed(2)}</Text>
      </View>

      {/* Payment Method */}
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Payment Method:</Text>
        <Text style={styles.infoValue}>
          {order.payment_method === "gcash" ? "💳 GCash" : "💰 On-Counter"}
        </Text>
      </View>

      {/* Dining Option */}
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Dining Option:</Text>
        <Text style={styles.infoValue}>
          {order.dining_option === "dine-in" ? "🍽️ Dine-in" : "🥡 Take-out"}
        </Text>
      </View>

      {/* Schedule Time */}
      {order.schedule_time && (
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Scheduled for:</Text>
          <Text style={[styles.infoValue, styles.scheduleTime]}>
            📅 {formatManila(order.schedule_time)}
          </Text>
        </View>
      )}

      {/* Order Date */}
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Order Date:</Text>
        <Text style={styles.infoValue}>{formatManila(order.created_at)}</Text>
      </View>

      {/* GCash screenshot */}
      {order.gcash_screenshot && (
        <>
          <Text style={styles.sectionHeader}>GCash Screenshot:</Text>
          <Image source={{ uri: order.gcash_screenshot }} style={styles.paymentProof} />
        </>
      )}

      {order.note && (
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Note:</Text>
          <Text style={styles.infoValue}>{order.note}</Text>
        </View>
      )}

      {/* Decline Reason */}
      {order.order_status === "declined" && order.decline_reason && (
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Decline Reason:</Text>
          <Text style={[styles.infoValue, styles.declineReason]}>{order.decline_reason}</Text>
        </View>
      )}

      {renderStatusButtons()}

      {/* Order items */}
      <Text style={styles.sectionHeader}>Items</Text>
      <FlatList
        data={order.items || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text style={styles.itemName}>{Number(item.quantity ?? 1)} x {item.item_name}</Text>
            <Text>₱{Number(item.total_price).toFixed(2)}</Text>
            {item.note && <Text style={styles.note}>Note: {item.note}</Text>}
            {item.variations?.length > 0 && (
              <View style={{ marginTop: 5 }}>
                {item.variations.map((v: any, vIndex: number) => (
                  <Text key={`${item.id}-${v.id}-${vIndex}`} style={styles.variation}>
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

      {/* Decline Reason Modal */}
      <Modal visible={declineModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalHeader}>Decline Order</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for declining this order:</Text>

            {/* Preset Reasons */}
            <Text style={styles.reasonLabel}>Select a reason:</Text>
            {[
              "Item not available",
              "Insufficient ingredients",
              "Concession is closed or about to close",
              "Order too large to fulfill",
              "Other (specify below)"
            ].map((reason, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.reasonOption,
                  selectedReason === (index === 4 ? "custom" : reason) && styles.selectedReason
                ]}
                onPress={() => {
                  setSelectedReason(index === 4 ? "custom" : reason);
                  if (index !== 4) setCustomReason("");
                }}
              >
                <Text style={[
                  styles.reasonText,
                  selectedReason === (index === 4 ? "custom" : reason) && styles.selectedReasonText
                ]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Custom Reason Input */}
            {selectedReason === "custom" && (
              <View style={styles.customReasonContainer}>
                <Text style={styles.reasonLabel}>Custom reason:</Text>
                <TextInput
                  style={styles.customReasonInput}
                  placeholder="Enter your reason for declining..."
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}

            {/* Modal Buttons */}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={cancelDecline}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitDeclineBtn}
                onPress={submitDecline}
                disabled={updatingStatus}
              >
                <Text style={styles.submitDeclineText}>
                  {updatingStatus ? "Declining..." : "Decline Order"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#fff" },
  customerSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  customerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  customerAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#A40C2D",
    alignItems: "center",
    justifyContent: "center",
  },
  customerInitials: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  customerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    color: "#666",
  },
  header: { fontSize: 20, fontWeight: "bold", marginBottom: 15, color: "#A40C2D" },
  infoSection: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },
  infoLabel: { fontSize: 14, fontWeight: "600", color: "#333", flex: 1 },
  infoValue: { fontSize: 14, color: "#666", flex: 1, textAlign: "right" },
  status: { fontWeight: "600", color: "#A40C2D" },
  statusText: { textTransform: "capitalize" },
  scheduleTime: { color: "#28a745", fontWeight: "500" },
  sectionHeader: { fontSize: 16, fontWeight: "600", marginTop: 15, marginBottom: 10 },
  itemCard: { backgroundColor: "#f9f9f9", padding: 10, borderRadius: 8, marginBottom: 8 },
  itemName: { fontWeight: "600" },
  variation: { fontSize: 13, color: "#444" },
  paymentProof: { marginTop: 5, width: "100%", height: 200, borderRadius: 10 },
  emptyText: { textAlign: "center", color: "#888", marginTop: 20 },
  note: { fontSize: 13, color: "#555", fontStyle: "italic", marginTop: 2 },
  buttonRow: { flexDirection: "row", marginTop: 15 },
  acceptBtn: { flex: 1, backgroundColor: "green", padding: 10, borderRadius: 8, marginRight: 5, alignItems: "center" },
  declineBtn: { flex: 1, backgroundColor: "red", padding: 10, borderRadius: 8, marginLeft: 5, alignItems: "center" },
  readyBtn: { flex: 1, backgroundColor: "orange", padding: 10, borderRadius: 8, marginTop: 10, alignItems: "center" },
  completeBtn: { flex: 1, backgroundColor: "#A40C2D", padding: 10, borderRadius: 8, marginTop: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
  declineReason: { color: "#dc3545", fontStyle: "italic" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    margin: 20,
    maxHeight: "80%",
    width: "90%",
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#A40C2D",
    marginBottom: 10,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 10,
    color: "#333",
  },
  reasonOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f9f9f9",
  },
  selectedReason: {
    backgroundColor: "#A40C2D",
    borderColor: "#A40C2D",
  },
  reasonText: {
    fontSize: 14,
    color: "#333",
  },
  selectedReasonText: {
    color: "#fff",
    fontWeight: "600",
  },
  customReasonContainer: {
    marginTop: 10,
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#fff",
    textAlignVertical: "top",
  },
  modalButtonRow: {
    flexDirection: "row",
    marginTop: 20,
    gap: 10,
  },
  cancelModalBtn: {
    flex: 1,
    backgroundColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelModalText: {
    color: "#fff",
    fontWeight: "600",
  },
  submitDeclineBtn: {
    flex: 1,
    backgroundColor: "#dc3545",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  submitDeclineText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default ViewOrderConcessionaire;
