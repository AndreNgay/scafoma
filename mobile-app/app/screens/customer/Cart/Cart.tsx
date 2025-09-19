import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Button } from "react-native";
import useStore from "../../../store";
import api from "../../../libs/apiCall";

const Cart = ({ navigation }: any) => {
  const user = useStore((state: any) => state.user);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.get(`/order/cart/${user.id}`);
      setCartItems(res.data || []);
    } catch (err) {
      console.error("Error fetching cart:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", fetchCart);
    return unsubscribe;
  }, [navigation, user?.id]);

  const checkout = async () => {
    try {
      await api.put(`/order/checkout/${user.id}`);
      alert("Checkout successful!");
      fetchCart();
    } catch (err) {
      console.error("Checkout failed:", err);
      alert("Checkout failed");
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.item_name}</Text>
      <Text>
        {item.quantity} × ₱{Number(item.base_price).toFixed(2)}
      </Text>
      {item.variations?.length ? (
        <Text style={styles.variationText}>+ {item.variations.join(", ")}</Text>
      ) : null}
      <Text style={styles.subtotal}>Subtotal: ₱{Number(item.order_detail_total).toFixed(2)}</Text>
      <Text style={styles.concession}>
        {item.cafeteria_name} • {item.concession_name}
      </Text>
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
          <View style={styles.checkoutContainer}>
            <Button title="Checkout" onPress={checkout} color="#A40C2D" />
          </View>
        </>
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
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  emptyText: { textAlign: "center", marginTop: 20, color: "#888" },
});

export default Cart;
