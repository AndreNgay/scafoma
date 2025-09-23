import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import useStore from "../../../store";
import api from "../../../libs/apiCall";

const MenuItemDetails = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { item, concession, cafeteria } = route.params;

  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [groupedVariations, setGroupedVariations] = useState<any>({});
  const [selectedVariations, setSelectedVariations] = useState<any[]>([]);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [canLeaveFeedback, setCanLeaveFeedback] = useState(false);

  // Feedback form states
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const user = useStore.getState().user;

  // Fetch variation groups + feedback + feedback eligibility
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Variations
        const res = await api.get(`/item-variation-group/${item.id}`);
        const groups = res.data.data;

        const grouped: any = {};
        for (const g of groups) {
          const vRes = await api.get(`/item-variation/group/${g.id}`);
          grouped[g.variation_group_name] = {
            ...g,
            variations: vRes.data.data,
          };
        }
        setGroupedVariations(grouped);

        // Feedbacks
        const feedbackRes = await api.get(`/feedback/${item.id}`);
        setFeedbacks(feedbackRes.data);

        // Check if user can leave feedback
        if (user) {
          const checkRes = await api.get(
            `/feedback/can-leave/${item.id}/${user.id}`
          );
          setCanLeaveFeedback(checkRes.data.canLeave);
        }
      } catch (err: any) {
        console.error("Error fetching data:", err.response?.data || err);
        setFeedbacks([]);
      }
    };

    fetchData();
  }, [item.id, user]);

  // Price calculation
  const basePrice = Number(item.price) || 0;
  const variationTotal = selectedVariations.reduce(
    (sum, v) => sum + Number(v.additional_price || 0),
    0
  );
  const displayPrice = (basePrice + variationTotal) * quantity;

  // Handle variation selection
  const toggleVariation = (group: any, variation: any) => {
    const alreadySelected = selectedVariations.find((v) => v.id === variation.id);

    if (group.multiple_selection) {
      if (alreadySelected) {
        setSelectedVariations(selectedVariations.filter((v) => v.id !== variation.id));
      } else {
        setSelectedVariations([...selectedVariations, { ...variation, group_id: group.id }]);
      }
    } else {
      setSelectedVariations([
        ...selectedVariations.filter((v) => v.group_id !== group.id),
        { ...variation, group_id: group.id },
      ]);
    }
  };

  // Submit order/cart
  const submitOrder = async (inCart: boolean) => {
    try {
      setPlacingOrder(true);
      if (!user) return Alert.alert("Error", "You must be logged in to place an order.");

      // Validate required selections
      for (const [groupName, group] of Object.entries<any>(groupedVariations)) {
        if (group.required_selection) {
          const hasSelection = selectedVariations.some((v) => v.group_id === group.id);
          if (!hasSelection) {
            setPlacingOrder(false);
            return Alert.alert("Missing Selection", `Please select at least one option from "${groupName}".`);
          }
        }
      }

      // Create order
      const orderRes = await api.post("/order", {
        customer_id: user.id,
        concession_id: item.concession_id,
        order_status: inCart ? "cart" : "pending",
        total_price: 0,
        in_cart: inCart,
        payment_method: null,
      });

      const orderId = orderRes.data.id;

      // Add order detail with note
      const detailRes = await api.post("/order-detail", {
        order_id: orderId,
        item_id: item.id,
        quantity,
        item_price: item.price,
        total_price: displayPrice,
        note,
      });

      const orderDetailId = detailRes.data.id;

      // Add variations
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

  // Submit feedback
  const submitFeedback = async () => {
    if (!user) return Alert.alert("Error", "You must be logged in to leave feedback.");
    if (rating < 1 || rating > 5) return Alert.alert("Invalid Rating", "Please select a rating between 1 and 5.");

    try {
      setSubmittingFeedback(true);
      await api.post("/feedback", {
        customer_id: user.id,
        menu_item_id: item.id,
        rating,
        comment,
      });
      Alert.alert("Thank you!", "Your feedback has been submitted.");
      setRating(0);
      setComment("");

      // Refresh feedback list
      const res = await api.get(`/feedback/${item.id}`);
      setFeedbacks(res.data);
      setCanLeaveFeedback(false); // prevent multiple feedbacks
    } catch (err: any) {
      console.error(err.response?.data || err);
      Alert.alert("Error", err.response?.data?.message ?? "Failed to submit feedback.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 200 }}>
        {/* Item Header */}
        <Image source={{ uri: item.image_url }} style={styles.image} />
        <Text style={styles.title}>{item.item_name}</Text>

        {/* Cafeteria + Concession */}
        <Text style={styles.subText}>
          {cafeteria?.cafeteria_name} •{" "}
          <Text
            style={styles.link}
            onPress={() => navigation.navigate("View Concession", { concession, cafeteria })}
          >
            {concession?.concession_name}
          </Text>
        </Text>

        {/* Price + Quantity */}
        <View style={styles.priceQuantityWrapper}>
          <Text style={styles.price}>₱{displayPrice.toFixed(2)}</Text>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              style={styles.qtyBtn}
            >
              <Text style={styles.qtyText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <TouchableOpacity
              onPress={() => setQuantity(quantity + 1)}
              style={styles.qtyBtn}
            >
              <Text style={styles.qtyText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.desc}>{item.description}</Text>

        {/* Variations */}
        {Object.entries<any>(groupedVariations).map(([groupName, group]) => (
          <View key={group.id} style={styles.group}>
            <Text style={styles.groupTitle}>
              {groupName}{" "}
              {group.required_selection && <Text style={styles.required}>*Required</Text>}
              {group.multiple_selection && (
                <Text style={styles.multiple}>(Multiple choices allowed)</Text>
              )}
            </Text>
            {group.variations.map((variation: any) => {
              const isSelected = selectedVariations.some((v) => v.id === variation.id);
              return (
                <TouchableOpacity
                  key={variation.id}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => toggleVariation(group, variation)}
                >
                  <Text>{variation.variation_name} (+₱{variation.additional_price})</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Note */}
        <Text style={styles.noteLabel}>Add Note:</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="e.g. No onions, extra spicy..."
          value={note}
          onChangeText={setNote}
          multiline
        />

        {/* Buttons */}
        <TouchableOpacity
          style={styles.btn}
          onPress={() => submitOrder(true)}
          disabled={placingOrder}
        >
          <Text style={styles.btnText}>Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnAlt]}
          onPress={() => submitOrder(false)}
          disabled={placingOrder}
        >
          <Text style={styles.btnText}>Place Order</Text>
        </TouchableOpacity>

        {/* Feedback Section */}
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackTitle}>Customer Feedback</Text>
          {feedbacks.length === 0 ? (
            <Text style={styles.noFeedback}>No feedback yet.</Text>
          ) : (
            feedbacks.map((fb) => (
              <View key={fb.id} style={styles.feedbackCard}>
                <Text style={styles.feedbackUser}>
                  {fb.first_name} {fb.last_name}
                </Text>
                <Text style={styles.feedbackRating}>⭐ {fb.rating}</Text>
                <Text style={styles.feedbackComment}>{fb.comment}</Text>
                <Text style={styles.feedbackDate}>
                  {new Date(fb.created_at).toLocaleString()}
                </Text>
              </View>
            ))
          )}

          {/* Feedback Form or Message */}
          {canLeaveFeedback ? (
            <View style={styles.addFeedbackForm}>
              <Text style={styles.addFeedbackTitle}>Leave Your Feedback</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Text style={[styles.star, rating >= star && styles.starSelected]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.feedbackInput}
                placeholder="Write your comment..."
                value={comment}
                onChangeText={setComment}
                multiline
              />
              <TouchableOpacity
                style={styles.btn}
                onPress={submitFeedback}
                disabled={submittingFeedback}
              >
                <Text style={styles.btnText}>Submit Feedback</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={{ marginTop: 10, color: "#888", fontStyle: "italic" }}>
              You can leave feedback once you’ve ordered this item.
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#fff" },
  image: { width: "100%", height: 200, borderRadius: 10, marginBottom: 15 },
  title: { fontSize: 22, fontWeight: "bold", color: "#A40C2D" },
  subText: { fontSize: 14, color: "#555", marginBottom: 5 },
  link: { color: "#A40C2D", fontWeight: "600" },

  priceQuantityWrapper: { alignItems: "flex-start", marginVertical: 10 },
  price: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#A40C2D",
    backgroundColor: "#F8EAEA",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  quantityContainer: { flexDirection: "row", alignItems: "center" },
  qtyBtn: {
    padding: 6,
    backgroundColor: "#A40C2D",
    borderRadius: 6,
    marginHorizontal: 8,
  },
  qtyText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  qtyValue: { fontSize: 16, fontWeight: "600" },

  desc: { fontSize: 14, color: "#666", marginBottom: 15 },
  group: { marginBottom: 20 },
  groupTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  required: { color: "red", fontSize: 14 },
  multiple: { fontSize: 12, color: "#555", marginLeft: 5 },
  option: {
    padding: 10,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    marginBottom: 6,
  },
  optionSelected: {
    backgroundColor: "#A40C2D33",
    borderWidth: 1,
    borderColor: "#A40C2D",
  },

  noteLabel: { fontSize: 14, fontWeight: "600", marginTop: 10, marginBottom: 5 },
  noteInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    minHeight: 50,
    marginBottom: 15,
  },

  btn: {
    backgroundColor: "#A40C2D",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  btnAlt: { backgroundColor: "#444" },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  feedbackContainer: { marginTop: 20 },
  feedbackTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  noFeedback: { color: "#888", fontStyle: "italic" },
  feedbackCard: {
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  feedbackUser: { fontWeight: "600", marginBottom: 3 },
  feedbackRating: { color: "#A40C2D", marginBottom: 3 },
  feedbackComment: { color: "#333" },
  feedbackDate: { fontSize: 12, color: "#888", marginTop: 5 },

  addFeedbackForm: { marginTop: 20 },
  addFeedbackTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  ratingRow: { flexDirection: "row", marginBottom: 10 },
  star: { fontSize: 28, color: "#ccc", marginHorizontal: 5 },
  starSelected: { color: "#FFD700" },
  feedbackInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    minHeight: 60,
    marginBottom: 10,
  },
});

export default MenuItemDetails;
