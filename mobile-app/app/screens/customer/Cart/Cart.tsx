import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Button, TouchableOpacity, Platform } from "react-native";
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
  try {
    await api.put(`/order-detail/${orderDetailId}/quantity`, { quantity: newQty });
    fetchCart();
  } catch (err) {
    console.error("Error updating quantity:", err);
  }
};

const removeItem = async (orderDetailId: number) => {
  try {
    await api.delete(`/order-detail/${orderDetailId}`);
    fetchCart();
  } catch (err) {
    console.error("Error removing item:", err);
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
const renderItem = ({ item }: any) => (
  <View style={styles.card}>
    <Text style={styles.title}>{item.item_name}</Text>
    <Text>
      ₱{Number(item.base_price).toFixed(2)}
    </Text>
    {item.variations?.length ? (
      <Text style={styles.variationText}>+ {item.variations.join(", ")}</Text>
    ) : null}

    <View style={styles.quantityRow}>
      <TouchableOpacity onPress={() => updateQuantity(item.order_detail_id, item.quantity - 1)}>
        <Text style={styles.qtyBtn}>−</Text>
      </TouchableOpacity>
      <Text style={styles.qtyText}>{item.quantity}</Text>
      <TouchableOpacity onPress={() => updateQuantity(item.order_detail_id, item.quantity + 1)}>
        <Text style={styles.qtyBtn}>＋</Text>
      </TouchableOpacity>
    </View>

    <Text style={styles.subtotal}>Subtotal: ₱{Number(item.order_detail_total).toFixed(2)}</Text>
    <Text style={styles.concession}>
      {item.cafeteria_name} • {item.concession_name}
    </Text>

    <TouchableOpacity onPress={() => removeItem(item.order_detail_id)} style={styles.removeBtn}>
      <Text style={{ color: "#fff" }}>Remove</Text>
    </TouchableOpacity>
  </View>
);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Cart</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#A40C2D" />
      ) : cartItems.length === 0 ? (
        <Text style={styles.emptyText}>Your cart is empty</Text>
      ) : (
        <>
          <FlatList
            data={cartItems}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 80 }}
          />
          
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
          
          <View style={styles.checkoutContainer}>
            <Button title={scheduleTime ? "Schedule Order" : "Place Order"} onPress={checkout} color="#A40C2D" />
          </View>
        </>
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
  container: { flex: 1, backgroundColor: "#fff", padding: 15 },
  header: { fontSize: 20, fontWeight: "bold", marginBottom: 15, color: "#A40C2D" },
  card: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: { fontSize: 16, fontWeight: "600" },
  variationText: { fontSize: 13, color: "#555", marginTop: 3 },
  subtotal: { marginTop: 5, fontWeight: "600", color: "#A40C2D" },
  concession: { fontSize: 12, color: "#666", marginTop: 5 },
  checkoutContainer: {
    marginTop: 16,
  },
  emptyText: { textAlign: "center", marginTop: 20, color: "#888" },
  quantityRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 5,
},
qtyBtn: {
  fontSize: 20,
  paddingHorizontal: 10,
  color: "#A40C2D",
},
qtyText: {
  fontSize: 16,
  marginHorizontal: 8,
},
removeBtn: {
  backgroundColor: "#A40C2D",
  padding: 8,
  borderRadius: 6,
  marginTop: 8,
  alignSelf: "flex-start",
},
scheduleContainer: {
  backgroundColor: "#f8f9fa",
  padding: 15,
  borderRadius: 10,
  marginBottom: 15,
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
disabledText: {
  color: "#ccc",
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

});

export default Cart;
