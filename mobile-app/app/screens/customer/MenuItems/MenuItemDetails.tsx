// screens/customer/MenuItemDetails.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  ScrollView,
  Image,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import api from "../../../libs/apiCall"; // axios instance

const MenuItemDetails = () => {
  const route = useRoute<any>();
  const { item } = route.params; // now receiving full item

  const [variations, setVariations] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(false);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);

  // Fetch variations
  const fetchVariations = async () => {
    try {
      setLoadingVariations(true);
      const res = await api.get(`/item-variation/${item.id}`);
      setVariations(res.data.data || []);
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

  useEffect(() => {
    fetchVariations();
    fetchFeedbacks();
  }, [item.id]);

  return (
    <ScrollView style={styles.container}>
      {/* Item Info */}
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.image} />
      ) : (
        <View style={styles.placeholder} />
      )}
      <Text style={styles.itemName}>{item.item_name}</Text>
      <Text style={styles.subText}>
        {item.concession_name} • {item.cafeteria_name}
      </Text>
      {item.category && (
        <Text style={styles.categoryTag}>{item.category}</Text>
      )}
      <Text style={styles.price}>₱{item.price.toFixed(2)}</Text>

      {/* Variations */}
      <Text style={styles.sectionHeader}>Variations</Text>
      {loadingVariations ? (
        <ActivityIndicator color="#A40C2D" size="large" />
      ) : variations.length === 0 ? (
        <Text style={styles.emptyText}>No variations available</Text>
      ) : (
        <FlatList
          data={variations}
          keyExtractor={(v) => v.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.variationName}>
                {item.label}: {item.variation_name}
              </Text>
              <Text style={styles.price}>+ ₱{item.additional_price}</Text>
              <Text style={styles.finalPrice}>
                Final Price: ₱{item.final_price}
              </Text>
            </View>
          )}
          scrollEnabled={false}
        />
      )}

      {/* Feedbacks */}
      <Text style={styles.sectionHeader}>Customer Feedback</Text>
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
            </View>
          )}
          scrollEnabled={false}
        />
      )}
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
  subText: { fontSize: 14, color: "#555", marginTop: 3 },
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
  card: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  variationName: { fontSize: 14, fontWeight: "500" },
  finalPrice: { fontSize: 13, color: "#A40C2D", fontWeight: "600" },
  feedbackCard: {
    backgroundColor: "#f1f1f1",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  feedbackAuthor: { fontWeight: "600" },
  feedbackRating: { fontSize: 13, color: "#A40C2D" },
  feedbackComment: { marginTop: 5, fontSize: 13 },
});

export default MenuItemDetails;
