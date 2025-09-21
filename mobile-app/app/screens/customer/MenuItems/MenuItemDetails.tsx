import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
  Button,
  Alert,
  TextInput,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import api from "../../../libs/apiCall";
import useStore from "../../../store";
import { Picker } from "@react-native-picker/picker";

const MenuItemDetails = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { item } = route.params;

  const [groupedVariations, setGroupedVariations] = useState<any>({});
  const [selectedVariations, setSelectedVariations] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(false);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [displayPrice, setDisplayPrice] = useState(Number(item.price) || 0);



  // Fetch variations
  const fetchVariations = async () => {
    try {
      setLoadingVariations(true);
      const resGroups = await api.get(`/item-variation-group/${item.id}`);
      const groups = resGroups.data.data || [];
      const grouped: any = {};
      for (const group of groups) {
        const resVars = await api.get(`/item-variation/group/${group.id}`);
        grouped[group.variation_group_name] = {
          id: group.id,
          multiple: group.multiple_selection,
          variations: resVars.data.data || [],
        };
      }
      setGroupedVariations(grouped);
    } catch (err) {
      console.error("Error fetching variations:", err);
    } finally {
      setLoadingVariations(false);
    }
  };

  // Fetch feedbacks
  const fetchFeedbacks = async () => {
    try {
      setLoadingFeedbacks(true);
      const res = await api.get(`/feedback/${item.id}`);
      setFeedbacks(res.data || []);
    } catch (err) {
      console.error("Error fetching feedbacks:", err);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  // Auto-update displayed price
  useEffect(() => {
    const base = Number(item.price) || 0;
    const extras = selectedVariations.reduce(
      (sum, v) => sum + Number(v.additional_price || 0),
      0
    );
    setDisplayPrice((base + extras) * quantity);
  }, [selectedVariations, item.price, quantity]);

  useEffect(() => {
    fetchVariations();
    fetchFeedbacks();
  }, [item.id]);

  // Toggle variation
  const toggleVariation = (variation: any, group: any) => {
    if (group.multiple) {
      setSelectedVariations((prev) =>
        prev.find((v) => v.id === variation.id)
          ? prev.filter((v) => v.id !== variation.id)
          : [...prev, variation]
      );
    } else {
      setSelectedVariations((prev) => [
        ...prev.filter((v) => v.group_id !== group.id),
        { ...variation, group_id: group.id },
      ]);
    }
  };

  // Add to cart / Place order
  const submitOrder = async (inCart: boolean) => {
    try {
      setPlacingOrder(true);
      const user = useStore.getState().user;
      if (!user) return Alert.alert("Error", "You must be logged in to place an order.");

      const orderRes = await api.post("/order", {
        customer_id: user.id,
        concession_id: item.concession_id,
        order_status: inCart ? "cart" : "pending", 
        note,
        total_price: 0,
        in_cart: inCart,
        payment_method: null, 
      });

      const orderId = orderRes.data.id;

      const detailRes = await api.post("/order-detail", {
        order_id: orderId,
        item_id: item.id,
        quantity,
        item_price: item.price,
        total_price: displayPrice,
        note,
      });

      const orderDetailId = detailRes.data.id;

      for (const v of selectedVariations) {
        await api.post("/order-item-variation", {
          order_detail_id: orderDetailId,
          variation_id: v.id,
        });
      }

      await api.put(`/order/${orderId}/recalculate`);

      Alert.alert("Success", inCart ? "Item added to cart!" : "Order placed successfully!");
      navigation.navigate(inCart ? "Cart" : "Orders");

    } catch (err: any) {
      console.error(err.response?.data || err);
      Alert.alert("Error", err.response?.data?.message ?? "Failed to submit order.");
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.image} />
      ) : (
        <View style={styles.placeholder} />
      )}

      <Text style={styles.itemName}>{item.item_name}</Text>

      <TouchableOpacity
        onPress={() => navigation.navigate("View Concession", { concession: item })}
      >
        <Text style={styles.linkText}>
          {item.concession_name} • {item.cafeteria_name}
        </Text>
      </TouchableOpacity>

      <Text style={styles.price}>₱{Number(displayPrice).toFixed(2)}</Text>

      {/* Quantity Selector */}
      <View style={styles.quantityRow}>
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => setQuantity((q) => Math.max(1, q - 1))}
        >
          <Text style={styles.qtyButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.qtyText}>{quantity}</Text>
        <TouchableOpacity style={styles.qtyButton} onPress={() => setQuantity((q) => q + 1)}>
          <Text style={styles.qtyButtonText}>+</Text>
        </TouchableOpacity>
      </View>


      {/* Variations */}
      <Text style={styles.sectionHeader}>Variations</Text>
      {loadingVariations ? (
        <ActivityIndicator color="#A40C2D" size="large" />
      ) : Object.keys(groupedVariations).length === 0 ? (
        <Text style={styles.emptyText}>No variations available</Text>
      ) : (
        Object.keys(groupedVariations).map((groupName) => {
          const group = groupedVariations[groupName];
          return (
            <View key={groupName} style={styles.group}>
              <Text style={styles.groupLabel}>
                {groupName} {group.multiple ? "(Can Choose multiple)" : "(Choose one)"}
              </Text>
              {group.variations.map((v: any) => {
                const isSelected = selectedVariations.some((sv) => sv.id === v.id);
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.card, isSelected && { borderColor: "#A40C2D", borderWidth: 2 }]}
                    onPress={() => toggleVariation(v, group)}
                  >
                    <Text style={styles.variationName}>{v.variation_name}</Text>
                    <Text style={styles.price}>+ ₱{v.additional_price}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })
      )}

      <Text style={styles.sectionHeader}>Notes for Concessionaire</Text>
      <TextInput
        style={styles.noteInput}
        placeholder="e.g., No onion, extra sauce"
        value={note}
        onChangeText={setNote}
      />

      {/* Feedbacks */}
      <Text style={styles.sectionHeader}>Feedbacks</Text>
      {loadingFeedbacks ? (
        <ActivityIndicator color="#A40C2D" size="large" />
      ) : feedbacks.length === 0 ? (
        <Text style={styles.emptyText}>No feedbacks yet</Text>
      ) : (
        feedbacks.map((f) => (
          <View key={f.id} style={styles.feedbackCard}>
            <Text style={styles.feedbackUser}>{`${f.first_name} ${f.last_name}`}</Text>
            <View style={{ flexDirection: "row", marginBottom: 4 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Text key={i} style={{ color: "#FFD700", fontSize: 20, marginRight: 2 }}>
                  {i < Number(f.rating) ? "★" : "☆"}
                </Text>
              ))}
            </View>
            <Text style={styles.feedbackText}>{f.comment}</Text>
          </View>
        ))
      )}

      {/* Action Buttons */}
      <View style={{ marginVertical: 20 }}>
        <Button
          title={placingOrder ? "Placing Order..." : "Place Order"}
          color="#A40C2D"
          onPress={() => submitOrder(false)}
          disabled={placingOrder}
        />
      </View>

      <View style={{ marginVertical: 10 }}>
        <Button
          title={placingOrder ? "Adding to Cart..." : "Add to Cart"}
          color="#A40C2D"
          onPress={() => submitOrder(true)}
          disabled={placingOrder}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#fff" },
  image: { width: "100%", height: 200, borderRadius: 10, marginBottom: 15 },
  placeholder: { width: "100%", height: 200, borderRadius: 10, backgroundColor: "#ddd", marginBottom: 15 },
  itemName: { fontSize: 20, fontWeight: "bold" },
  linkText: { fontSize: 14, color: "#A40C2D", marginTop: 3, fontWeight: "600" },
  price: { marginTop: 5, fontWeight: "600", color: "#A40C2D", fontSize: 16 },
  sectionHeader: { fontSize: 16, fontWeight: "600", marginTop: 20, marginBottom: 10, color: "#A40C2D" },
  quantityRow: { flexDirection: "row", alignItems: "center", marginTop: 15, marginBottom: 10 },
  qtyButton: { borderWidth: 1, borderColor: "#A40C2D", borderRadius: 6, padding: 8, marginHorizontal: 10 },
  qtyButtonText: { fontSize: 18, color: "#A40C2D", fontWeight: "bold" },
  qtyText: { fontSize: 16, fontWeight: "600" },
  pickerContainer: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8 },
  noteInput: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 8, marginBottom: 15 },
  group: { marginBottom: 15 },
  groupLabel: { fontSize: 15, fontWeight: "600", marginBottom: 8, color: "#333" },
  card: { backgroundColor: "#f9f9f9", padding: 12, marginBottom: 8, borderRadius: 8 },
  variationName: { fontSize: 14, fontWeight: "500" },
  emptyText: { color: "#888", fontStyle: "italic" },
  feedbackCard: { backgroundColor: "#f1f1f1", padding: 10, borderRadius: 6, marginBottom: 8 },
  feedbackUser: { fontWeight: "600", marginBottom: 2 },
  feedbackText: { fontSize: 14 },
});

export default MenuItemDetails;
