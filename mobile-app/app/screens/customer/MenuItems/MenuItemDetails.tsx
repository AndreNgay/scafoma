import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  ScrollView,
  Image,
  TouchableOpacity,
  Button,
  Alert,
  TextInput,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import api from "../../../libs/apiCall"; // axios instance
import useStore from "../../../store";

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

  // 🔹 Fetch variations and groups
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
  // 🔹 Add to Cart
const addToCart = async () => {
  try {
    setPlacingOrder(true);
    const user = useStore.getState().user;
    if (!user) {
      Alert.alert("Error", "You must be logged in to add items to cart.");
      return;
    }

    const orderRes = await api.post("/order", {
      customer_id: user.id,
      concession_id: item.concession_id,
      status: "pending",
      total_price: 0,
      in_cart: true,
    });

    const orderId = orderRes.data.id;

    // inside addToCart
    const detailRes = await api.post("/order-detail", {
      order_id: orderId,
      item_id: item.id,
      quantity,
      item_price: item.price,
      total_price: displayPrice,
      note, // <-- must be here too
    });


    const orderDetailId = detailRes.data.id;

    for (const v of selectedVariations) {
      await api.post("/order-item-variation", {
        order_detail_id: orderDetailId,
        variation_id: v.id,
      });
    }

    await api.put(`/order/${orderId}/recalculate`);

    Alert.alert("Success", "Item added to cart!");
    navigation.navigate("Cart"); // 🔹 Create Cart screen if not yet
  } catch (err: any) {
    console.error("Error adding to cart:", err.response?.data || err);
    Alert.alert("Error", err.response?.data?.message ?? "Failed to add to cart.");
  } finally {
    setPlacingOrder(false);
  }
};


  // 🔹 Fetch feedbacks
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

  // 🔹 Handle selecting variations
  const toggleVariation = (variation: any, group: any) => {
    if (group.multiple) {
      setSelectedVariations((prev) => {
        if (prev.find((v) => v.id === variation.id)) {
          return prev.filter((v) => v.id !== variation.id);
        } else {
          return [...prev, variation];
        }
      });
    } else {
      setSelectedVariations((prev) => [
        ...prev.filter((v) => v.group_id !== group.id),
        { ...variation, group_id: group.id },
      ]);
    }
  };

  // 🔹 Auto-update displayed price
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

  // 🔹 Place Order
  const placeOrder = async () => {
    try {
      setPlacingOrder(true);
      const user = useStore.getState().user;
      if (!user) {
        Alert.alert("Error", "You must be logged in to place an order.");
        return;
      }

      const orderRes = await api.post("/order", {
        customer_id: user.id,
        concession_id: item.concession_id,
        status: "pending",
        note: note,
        total_price: 0,
      });
      const orderId = orderRes.data.id;

      const detailRes = await api.post("/order-detail", {
        order_id: orderId,
        item_id: item.id,
        quantity,
        item_price: item.price,
        total_price: displayPrice,
        note, // <-- must be here too
      });

      const orderDetailId = detailRes.data.id;

      for (const v of selectedVariations) {
        await api.post("/order-item-variation", {
          order_detail_id: orderDetailId,
          variation_id: v.id,
        });
      }

      await api.put(`/order/${orderId}/recalculate`);

      Alert.alert("Success", "Order placed successfully!");
      navigation.navigate("Orders");
    } catch (err: any) {
      console.error("Error placing order:", err.response?.data || err);
      Alert.alert(
        "Error",
        err.response?.data?.message ?? "Failed to place order."
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  // 🔹 Format feedback date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
        onPress={() =>
          navigation.navigate("View Concession", { concession: item })
        }
      >
        <Text style={styles.linkText}>
          {item.concession_name} • {item.cafeteria_name}
        </Text>
      </TouchableOpacity>

      {item.category && (
        <Text style={styles.categoryTag}>{item.category}</Text>
      )}
      {/* 🔹 This price updates automatically */}
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
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => setQuantity((q) => q + 1)}
        >
          <Text style={styles.qtyButtonText}>+</Text>
        </TouchableOpacity>
      </View>

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
                {groupName}{" "}
                {group.multiple ? "(Can Choose multiple)" : "(Choose one)"}
              </Text>
              {group.variations.map((v: any) => {
                const isSelected = selectedVariations.some(
                  (sv) => sv.id === v.id
                );
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[
                      styles.card,
                      isSelected && { borderColor: "#A40C2D", borderWidth: 2 },
                    ]}
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

      <Text style={styles.sectionHeader}>Notes for concessionaire</Text>
      <TextInput
        style={styles.noteInput}
        placeholder="e.g., No onion, extra sauce"
        value={note}
        onChangeText={setNote}
      />

      {/* Feedbacks */}
      <Text style={styles.sectionHeader}>Customer Feedbacks</Text>
      {loadingFeedbacks ? (
        <ActivityIndicator color="#A40C2D" size="large" />
      ) : feedbacks.length === 0 ? (
        <Text style={styles.emptyText}>No feedback yet</Text>
      ) : (
        <FlatList
          data={feedbacks}
          keyExtractor={(f) => f.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackAuthor}>
                {item.first_name} {item.last_name}
              </Text>
              <Text style={styles.feedbackRating}>⭐ {item.rating}/5</Text>
              <Text style={styles.feedbackComment}>{item.comment}</Text>
              <Text style={styles.feedbackDate}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          )}
          scrollEnabled={false}
        />
      )}

<View style={{ marginVertical: 20 }}>
  <Button
    title={placingOrder ? "Placing Order..." : "Place Order"}
    color="#A40C2D"
    onPress={placeOrder}
    disabled={placingOrder}
  />
</View>

<View style={{ marginVertical: 10 }}>
  <Button
    title={placingOrder ? "Adding to Cart..." : "Add to Cart"}
    color="#A40C2D"
    onPress={addToCart}
    disabled={placingOrder}
  />
</View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#fff" },
  image: { width: "100%", height: 200, borderRadius: 10, marginBottom: 15 },
  placeholder: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    backgroundColor: "#ddd",
    marginBottom: 15,
  },
  itemName: { fontSize: 20, fontWeight: "bold" },
  linkText: {
    fontSize: 14,
    color: "#A40C2D",
    marginTop: 3,
    fontWeight: "600",
  },
  categoryTag: {
    marginTop: 3,
    fontSize: 14,
    color: "#A40C2D",
    fontWeight: "600",
  },
  price: { marginTop: 5, fontWeight: "600", color: "#A40C2D", fontSize: 16 },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
    color: "#A40C2D",
  },
  emptyText: { color: "#888", fontStyle: "italic" },
  group: { marginBottom: 15 },
  groupLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  card: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  variationName: { fontSize: 14, fontWeight: "500" },
  feedbackCard: {
    backgroundColor: "#f1f1f1",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  feedbackAuthor: { fontWeight: "600" },
  feedbackRating: { fontSize: 13, color: "#A40C2D" },
  feedbackComment: { marginTop: 5, fontSize: 13 },
  feedbackDate: { marginTop: 3, fontSize: 12, color: "#666" },
  noteInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 10,
  },
  qtyButton: {
    borderWidth: 1,
    borderColor: "#A40C2D",
    borderRadius: 6,
    padding: 8,
    marginHorizontal: 10,
  },
  qtyButtonText: {
    fontSize: 18,
    color: "#A40C2D",
    fontWeight: "bold",
  },
  qtyText: { fontSize: 16, fontWeight: "600" },
});

export default MenuItemDetails;
