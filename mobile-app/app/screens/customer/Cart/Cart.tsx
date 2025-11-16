import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Button, TouchableOpacity, Platform, ScrollView } from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import useStore from "../../../store";
import api from "../../../libs/apiCall";

const Cart = ({ navigation }: any) => {
  const user = useStore((state: any) => state.user);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [previousCartCount, setPreviousCartCount] = useState(0);
  const [scheduleTime, setScheduleTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);

  const fetchCart = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.get(`/order/cart/${user.id}`);
      const newCartItems = res.data || [];
      
      setCartItems(newCartItems);
      setPreviousCartCount(newCartItems.length);
    } catch (err) {
      console.error("Error fetching cart:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (orderDetailId: number, newQty: number) => {
  if (newQty < 1) return;
  try {
    setUpdatingItemId(orderDetailId);
    await api.put(`/order-detail/${orderDetailId}/quantity`, { quantity: newQty });
    await fetchCart();
  } catch (err) {
    console.error("Error updating quantity:", err);
    alert("Failed to update quantity. Please try again.");
  } finally {
    setUpdatingItemId(null);
  }
};

const removeItem = async (orderDetailId: number) => {
  try {
    setUpdatingItemId(orderDetailId);
    await api.delete(`/order-detail/${orderDetailId}`);
    await fetchCart();
  } catch (err) {
    console.error("Error removing item:", err);
    alert("Failed to remove item. Please try again.");
  } finally {
    setUpdatingItemId(null);
  }
};

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", fetchCart);
    return unsubscribe;
  }, [navigation, user?.id]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    // Do not save if user cancelled the picker
    if (Platform.OS === 'android' && event?.type === 'dismissed') return;
    if (!selectedDate) return;

    // If we already have a time selected, preserve it
    if (scheduleTime) {
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(scheduleTime.getHours());
      newDateTime.setMinutes(scheduleTime.getMinutes());
      newDateTime.setSeconds(0);
      newDateTime.setMilliseconds(0);
      setScheduleTime(newDateTime);
    } else {
      // Just set the date, time will be set to current time
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(new Date().getHours());
      newDateTime.setMinutes(new Date().getMinutes());
      newDateTime.setSeconds(0);
      newDateTime.setMilliseconds(0);
      setScheduleTime(newDateTime);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    // Do not save if user cancelled the picker
    if (Platform.OS === 'android' && event?.type === 'dismissed') return;
    if (!selectedTime) return;

    // Use existing scheduleTime date or current date if no date selected yet
    const baseDate = scheduleTime || new Date();
    const combinedDateTime = new Date(baseDate);
    combinedDateTime.setHours(selectedTime.getHours());
    combinedDateTime.setMinutes(selectedTime.getMinutes());
    combinedDateTime.setSeconds(0);
    combinedDateTime.setMilliseconds(0);
    setScheduleTime(combinedDateTime);
  };

  const clearScheduleTime = () => {
    setScheduleTime(null);
  };

  const checkout = async () => {
    try {
      // Validate schedule time if set
      if (scheduleTime && scheduleTime <= new Date()) {
        alert("Please select a future date and time for scheduling.");
        return;
      }
      
      const checkoutData: any = {};
      
      // Add schedule_time if set
      if (scheduleTime) {
        checkoutData.schedule_time = scheduleTime.toISOString();
      }
      
      const response = await api.put(`/order/checkout/${user.id}`, checkoutData);
      let message = "Checkout successful!";
      
      if (scheduleTime) {
        message += `\n\nScheduled for: ${scheduleTime.toLocaleString()}`;
      }
      
      // Check if any items were cleaned up during checkout
      if (response.data.cleanedItems) {
        message += `\n\nNote: ${response.data.cleanedItems}`;
      }
      
      alert(message);
      setScheduleTime(null); // Clear schedule time after checkout
      const createdOrders = response.data?.orders || [];
      if (Array.isArray(createdOrders) && createdOrders.length === 1) {
        const orderId = createdOrders[0]?.id;
        if (orderId) {
          // Redirect directly to the single order's details
          navigation.navigate("Orders", { screen: "View Order", params: { orderId } });
        } else {
          navigation.navigate("Orders", { screen: "Customer Orders" });
        }
      } else {
        // Multiple concessions/orders → go to Orders list
        navigation.navigate("Orders", { screen: "Customer Orders" });
      }
    } catch (err: any) {
      console.error("Checkout failed:", err);
      const errorMessage = err.response?.data?.error || "Checkout failed";
      alert(errorMessage);
    }
  };
const renderItem = ({ item }: any) => {
  const isUpdating = updatingItemId === item.order_detail_id;
  
  return (
    <View style={[styles.card, isUpdating && styles.cardUpdating]}>
      {isUpdating && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#A40C2D" />
        </View>
      )}
      
      <View style={styles.cardHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.title}>{item.item_name}</Text>
          <Text style={styles.concession}>
            {item.cafeteria_name} • {item.concession_name}
          </Text>
        </View>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.basePrice}>₱{(Number(item.order_detail_total) / item.quantity).toFixed(2)}</Text>
        {item.variations?.length > 0 && (
          <Text style={styles.variationText}>{item.variations.join(", ")}</Text>
        )}
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.quantityRow}>
          <TouchableOpacity 
            onPress={() => updateQuantity(item.order_detail_id, item.quantity - 1)}
            style={[styles.qtyBtn, item.quantity <= 1 && styles.qtyBtnDisabled]}
            disabled={isUpdating || item.quantity <= 1}
          >
            <Text style={[styles.qtyBtnText, item.quantity <= 1 && styles.qtyBtnTextDisabled]}>−</Text>
          </TouchableOpacity>
          <View style={styles.qtyBox}>
            <Text style={styles.qtyText}>{item.quantity}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => updateQuantity(item.order_detail_id, item.quantity + 1)}
            style={styles.qtyBtn}
            disabled={isUpdating}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.subtotalContainer}>
          <Text style={styles.subtotalLabel}>Subtotal</Text>
          <Text style={styles.subtotal}>₱{Number(item.order_detail_total).toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity 
        onPress={() => removeItem(item.order_detail_id)} 
        style={styles.removeBtn}
        disabled={isUpdating}
      >
        <Text style={styles.removeBtnText}>🗑️ Remove</Text>
      </TouchableOpacity>
    </View>
  );
};

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + Number(item.order_detail_total), 0);
  };

  const totalAmount = calculateTotal();
  const itemCount = cartItems.length; // Number of unique items, not quantity

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>My Cart</Text>
        {cartItems.length > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>
          </View>
        )}
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A40C2D" />
          <Text style={styles.loadingText}>Loading your cart...</Text>
        </View>
      ) : cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Text style={styles.emptySubtext}>Add items from the menu to get started</Text>
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {cartItems.map((item, index) => (
            <View key={index}>
              {renderItem({ item })}
            </View>
          ))}
          
          {/* Total Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total ({itemCount} {itemCount === 1 ? 'item' : 'items'})</Text>
              <Text style={styles.summaryTotal}>₱{totalAmount.toFixed(2)}</Text>
            </View>
          </View>
          
          {/* Schedule Time Section */}
          <View style={styles.scheduleContainer}>
            <Text style={styles.scheduleTitle}>Schedule Pickup (Optional)</Text>
            <Text style={styles.scheduleSubtitle}>
              Order ahead for bulk orders or future pickup
            </Text>
            
            <View style={styles.scheduleButtons}>
              <TouchableOpacity 
                style={[styles.scheduleBtn, showDatePicker && styles.activeScheduleBtn]} 
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.scheduleBtnText, showDatePicker && styles.activeScheduleBtnText]}>
                  📅 Select Date
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.scheduleBtn, showTimePicker && styles.activeScheduleBtn]} 
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={[styles.scheduleBtnText, showTimePicker && styles.activeScheduleBtnText]}>
                  🕐 Select Time
                </Text>
              </TouchableOpacity>
            </View>
            
            {scheduleTime && (
              <View style={styles.scheduledTimeContainer}>
                <Text style={styles.scheduledTimeText}>
                  📅 Scheduled for: {scheduleTime.toLocaleString()}
                </Text>
                <TouchableOpacity onPress={clearScheduleTime} style={styles.clearScheduleBtn}>
                  <Text style={styles.clearScheduleText}>Clear</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.checkoutBtn} 
            onPress={checkout}
            activeOpacity={0.8}
          >
            <Text style={styles.checkoutBtnText}>
              {scheduleTime ? "📅 Schedule Order" : "🛍️ Place Order"}
            </Text>
            <Text style={styles.checkoutBtnAmount}>₱{totalAmount.toFixed(2)}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
      
      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={scheduleTime || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
      
      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={scheduleTime || new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff", 
    padding: 15 
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  header: { 
    fontSize: 24, 
    fontWeight: "bold", 
    color: "#A40C2D" 
  },
  headerBadge: {
    backgroundColor: "#A40C2D",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: { 
    textAlign: "center", 
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: "center",
    fontSize: 14,
    color: "#888",
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardUpdating: {
    opacity: 0.6,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 12,
    zIndex: 10,
  },
  cardHeader: {
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  title: { 
    fontSize: 17, 
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  concession: { 
    fontSize: 13, 
    color: "#666",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  basePrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#A40C2D",
    marginRight: 8,
  },
  variationText: { 
    fontSize: 12, 
    color: "#888",
    fontStyle: "italic",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  qtyBtn: {
    backgroundColor: "#f0f0f0",
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  qtyBtnDisabled: {
    backgroundColor: "#f8f8f8",
    borderColor: "#e8e8e8",
  },
  qtyBtnText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#A40C2D",
  },
  qtyBtnTextDisabled: {
    color: "#ccc",
  },
  qtyBox: {
    minWidth: 40,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  subtotalContainer: {
    alignItems: "flex-end",
  },
  subtotalLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  subtotal: { 
    fontSize: 18,
    fontWeight: "700", 
    color: "#A40C2D" 
  },
  removeBtn: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#ff4444",
  },
  removeBtnText: {
    color: "#ff4444",
    fontSize: 13,
    fontWeight: "600",
  },
  summaryContainer: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: "700",
    color: "#A40C2D",
  },
  scheduleContainer: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#A40C2D",
    marginBottom: 5,
  },
  scheduleSubtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 15,
  },
  scheduleButtons: {
    flexDirection: "row",
    gap: 10,
  },
  scheduleBtn: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  scheduleBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#A40C2D",
  },
  activeScheduleBtn: {
    backgroundColor: "#A40C2D",
    borderColor: "#A40C2D",
  },
  activeScheduleBtnText: {
    color: "#fff",
  },
  scheduledTimeContainer: {
    backgroundColor: "#e8f5e8",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#28a745",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  scheduledTimeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#28a745",
    flex: 1,
  },
  clearScheduleBtn: {
    backgroundColor: "#dc3545",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  clearScheduleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  checkoutBtn: {
    backgroundColor: "#A40C2D",
    padding: 14,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#A40C2D",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  checkoutBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  checkoutBtnAmount: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default Cart;
