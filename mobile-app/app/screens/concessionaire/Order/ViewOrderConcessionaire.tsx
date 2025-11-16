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
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import api from "../../../libs/apiCall";
import { useToast } from "../../../contexts/ToastContext";

const ViewOrderConcessionaire = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [adjustedTotal, setAdjustedTotal] = useState<string>("");
  const [priceReason, setPriceReason] = useState<string>("");
  const [customPriceReason, setCustomPriceReason] = useState<string>("");
  const { showToast } = useToast();

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
  const fetchOrderDetails = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await api.get(`/order/${orderId}`); // Backend route /order/:id
      setOrder(res.data);
    } catch (err) {
      console.error("Error fetching order details:", err);
      showToast("error", "Failed to fetch order details");
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
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
      showToast("success", `Order marked as ${newStatus}`);
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to update order status");
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
      showToast("error", "Please select a reason or provide a custom reason for declining this order.");
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

  const openAcceptModal = () => {
    if (!order) return;
    const baseTotal =
      order.updated_total_price !== null && order.updated_total_price !== undefined
        ? order.updated_total_price
        : order.total_price;
    const formatted =
      baseTotal !== null && baseTotal !== undefined && !Number.isNaN(Number(baseTotal))
        ? Number(baseTotal).toFixed(2)
        : "";
    setAdjustedTotal(formatted);
    setPriceReason("");
    setCustomPriceReason("");
    setAcceptModalVisible(true);
  };

  const cancelAccept = () => {
    setAcceptModalVisible(false);
    setPriceReason("");
    setCustomPriceReason("");
  };

  const submitAccept = async () => {
    if (!order) return;
    const originalTotal = Number(order.total_price ?? 0);
    const trimmed = adjustedTotal.trim();

    let newTotal: number | null = null;
    if (trimmed) {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || parsed < 0) {
        showToast("error", "Please enter a valid total amount.");
        return;
      }
      newTotal = parsed;
    }

    const payload: any = { order_status: "accepted" };

    if (newTotal !== null && newTotal !== originalTotal) {
      if (!priceReason && !customPriceReason.trim()) {
        showToast(
          "error",
          "Please select or enter a reason for changing the total."
        );
        return;
      }
      const reason =
        priceReason === "custom" ? customPriceReason.trim() : priceReason;
      payload.updated_total_price = newTotal;
      payload.price_change_reason = reason;
    }

    try {
      setUpdatingStatus(true);
      await api.put(`order/status/${order.id}`, payload);
      await fetchOrderDetails();
      showToast("success", "Order marked as accepted");
      setAcceptModalVisible(false);
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to update order status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const onRefresh = () => {
    if (loading) return;
    fetchOrderDetails(true);
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
              onPress={openAcceptModal}
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#A40C2D"
        />
      }
    >
      {/* Customer Info Section */}
      <TouchableOpacity 
        style={styles.customerSection}
        onPress={() => navigation.navigate("View Customer Profile", { customerId: order.customer_id })}
      >
        {order.customer_profile_image ? (
          <Image source={{ uri: order.customer_profile_image }} style={styles.customerAvatar} />
        ) : (
          <View style={styles.customerAvatarPlaceholder}>
            <Text style={styles.customerInitials}>
              {order.customer_first_name?.[0]}{order.customer_last_name?.[0]}
            </Text>
          </View>
        )}
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>
            {order.customer_first_name} {order.customer_last_name}
          </Text>
          <Text style={styles.customerEmail}>{order.customer_email}</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.header}>Order #{order.id}</Text>
      
      {/* Order Status & Basic Info */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>📋 Order Details</Text>
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Status:</Text>
          <Text style={[styles.status, styles.statusText]}>{order.order_status}</Text>
        </View>
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Order Date:</Text>
          <Text style={styles.infoValue}>{formatManila(order.created_at)}</Text>
        </View>
        {order.schedule_time && (
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Scheduled for:</Text>
            <Text style={[styles.infoValue, styles.scheduleTime]}>
              📅 {formatManila(order.schedule_time)}
            </Text>
          </View>
        )}
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Dining Option:</Text>
          <Text style={styles.infoValue}>
            {order.dining_option === "dine-in" ? "🍽️ Dine-in" : "🥡 Take-out"}
          </Text>
        </View>
        {order.note && (
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Note:</Text>
            <Text style={styles.infoValue}>{order.note}</Text>
          </View>
        )}
      </View>

      {/* Pricing Information */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>💰 Pricing</Text>
        {order.updated_total_price !== null &&
        order.updated_total_price !== undefined &&
        !Number.isNaN(Number(order.updated_total_price)) &&
        !Number.isNaN(Number(order.total_price)) &&
        Number(order.updated_total_price) !== Number(order.total_price) ? (
          <>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Original Total:</Text>
              <Text style={styles.infoValue}>
                ₱{Number(order.total_price).toFixed(2)}
              </Text>
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Updated Total:</Text>
              <Text style={[styles.infoValue, styles.updatedPrice]}>
                ₱{Number(order.updated_total_price).toFixed(2)}
              </Text>
            </View>
            {order.price_change_reason && (
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Price Change Reason:</Text>
                <Text style={styles.infoValue}>{order.price_change_reason}</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Total:</Text>
            <Text style={[styles.infoValue, styles.totalPrice]}>
              ₱{Number(order.total_price).toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* Payment Information */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>💳 Payment</Text>
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Payment Method:</Text>
          <View style={styles.paymentMethodDisplay}>
            {order.payment_method === "gcash" ? (
              <Text style={styles.infoValue}>GCash</Text>
            ) : (
              <Text style={styles.infoValue}>💰 On-Counter</Text>
            )}
          </View>
        </View>
        {order.payment_method === "gcash" && (
          <View style={styles.gcashSection}>
            {order.gcash_screenshot && (
              <View style={styles.paymentProofSection}>
                <Text style={styles.infoLabel}>GCash Screenshot:</Text>
                <Image source={{ uri: order.gcash_screenshot }} style={styles.paymentProof} />
              </View>
            )}
          </View>
        )}
      </View>

      {/* Decline Reason (if applicable) */}
      {order.order_status === "declined" && order.decline_reason && (
        <View style={[styles.sectionCard, styles.declineCard]}>
          <Text style={styles.sectionTitle}>❌ Decline Information</Text>
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Reason:</Text>
            <Text style={[styles.infoValue, styles.declineReason]}>{order.decline_reason}</Text>
          </View>
        </View>
      )}

      {/* Order Items */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🛒 Order Items</Text>
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
      </View>

      {renderStatusButtons()}

      {/* Accept Order Modal (optional price adjustment) */}
      <Modal visible={acceptModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalHeader}>Accept Order</Text>
            <Text style={styles.modalSubtitle}>
              You can optionally adjust the total before accepting.
            </Text>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Original Total:</Text>
              <Text style={styles.infoValue}>
                ₱{Number(order.total_price).toFixed(2)}
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>New Total (optional):</Text>
              <TextInput
                style={styles.customReasonInput}
                keyboardType="numeric"
                placeholder={Number(order.total_price).toFixed(2)}
                value={adjustedTotal}
                onChangeText={setAdjustedTotal}
              />
            </View>

            <Text style={styles.reasonLabel}>Reason for change (optional):</Text>
            {[
              "Applied discount",
              "Correcting system total",
              "Removed unavailable items",
              "Other (specify below)",
            ].map((reason, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.reasonOption,
                  (index === 3 ? priceReason === "custom" : priceReason === reason) &&
                    styles.selectedReason,
                ]}
                onPress={() => {
                  if (index === 3) {
                    setPriceReason("custom");
                  } else {
                    setPriceReason(reason);
                    setCustomPriceReason("");
                  }
                }}
              >
                <Text
                  style={[
                    styles.reasonText,
                    (index === 3 ? priceReason === "custom" : priceReason === reason) &&
                      styles.selectedReasonText,
                  ]}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            {priceReason === "custom" && (
              <View style={styles.customReasonContainer}>
                <Text style={styles.reasonLabel}>Custom reason:</Text>
                <TextInput
                  style={[styles.customReasonInput]}
                  placeholder="Enter your reason for changing the total..."
                  value={customPriceReason}
                  onChangeText={setCustomPriceReason}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={cancelAccept}
                disabled={updatingStatus}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitDeclineBtn}
                onPress={submitAccept}
                disabled={updatingStatus}
              >
                <Text style={styles.submitDeclineText}>
                  {updatingStatus ? "Saving..." : "Accept Order"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  container: { flex: 1, backgroundColor: "#fff" },
  contentContainer: { padding: 15, paddingBottom: 160 },
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
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#A40C2D",
    marginBottom: 12,
  },
  updatedPrice: {
    fontWeight: "600",
    color: "#28a745",
  },
  totalPrice: {
    fontWeight: "600",
    color: "#A40C2D",
  },
  paymentProofSection: {
    marginTop: 12,
  },
  declineCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#dc3545",
    backgroundColor: "#fff5f5",
  },
  gcashSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  paymentMethodDisplay: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
});

export default ViewOrderConcessionaire;
