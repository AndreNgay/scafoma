// screens/Menu/ViewMenu.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import api from "../../../libs/apiCall";

type Variation = { name: string; price: string };
type VariationGroup = {
  label: string;
  variations: Variation[];
  required_selection: boolean;
};

const ViewMenu: React.FC = () => {
  const route = useRoute<any>();
  const { menuItem } = route.params;

  const [variationGroups, setVariationGroups] = useState<VariationGroup[]>(menuItem?.variations || []);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  // Fetch feedbacks
  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const res = await api.get(`/feedback/${menuItem.id}`);
        setFeedbacks(res.data);
      } catch (err: any) {
        console.log("No feedback found", err.response?.data?.message || "");
        setFeedbacks([]);
      }
    };

    fetchFeedbacks();
  }, [menuItem.id]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Item Details */}
      {menuItem.image_url && (
        <Image source={{ uri: menuItem.image_url }} style={styles.image} />
      )}
      <Text style={styles.title}>{menuItem.item_name}</Text>

      {menuItem.category && (
        <>
          <Text style={styles.label}>Category</Text>
          <Text style={styles.value}>{menuItem.category}</Text>
        </>
      )}

      <Text style={styles.label}>Base Price</Text>
      <Text style={styles.value}>₱ {menuItem.price.toFixed(2)}</Text>

      <Text style={styles.label}>Availability</Text>
      <Text style={[styles.value, { color: menuItem.availability ? "green" : "red" }]}>
        {menuItem.availability ? "Available" : "Unavailable"}
      </Text>

      {/* Variations */}
      {variationGroups.length > 0 && (
        <>
          <Text style={styles.label}>Variations</Text>
          {variationGroups.map((group, gIndex) => (
            <View key={gIndex} style={styles.groupBox}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <Text style={styles.optionText}>
                Required Selection: {group.required_selection ? "Yes" : "No"}
              </Text>

              {group.variations.map((v, vIndex) => (
                <View key={vIndex} style={styles.variationRow}>
                  <Text style={styles.variationName}>{v.name}</Text>
                  <Text style={styles.variationPrice}>₱ {v.price}</Text>
                </View>
              ))}
            </View>
          ))}
        </>
      )}

      {/* Feedback Section */}
      <View style={styles.feedbackContainer}>
        <Text style={styles.feedbackTitle}>Customer Feedback</Text>
        {feedbacks.length === 0 ? (
          <Text style={styles.noFeedback}>No feedback yet.</Text>
        ) : (
          feedbacks.map((fb) => (
            <View key={fb.id} style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                {fb.profile_image ? (
                  <Image source={{ uri: fb.profile_image }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profilePlaceholder}>
                    <Text style={styles.profileInitials}>
                      {fb.first_name?.[0]}{fb.last_name?.[0]}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.feedbackUser}>{fb.first_name} {fb.last_name}</Text>
                  <Text style={styles.feedbackRating}>⭐ {fb.rating}</Text>
                </View>
              </View>
              {fb.comment && <Text style={styles.feedbackComment}>{fb.comment}</Text>}
              <Text style={styles.feedbackDate}>{new Date(fb.created_at).toLocaleString()}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

export default ViewMenu;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  image: { width: "100%", height: 200, borderRadius: 10, marginBottom: 15 },
  title: { fontSize: 22, fontWeight: "bold", color: "#A40C2D", marginBottom: 10 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12 },
  value: { fontSize: 16, marginTop: 4, color: "#333" },

  groupBox: {
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    backgroundColor: "#f9f9f9",
  },
  groupLabel: { fontWeight: "600", fontSize: 14, marginBottom: 6 },
  optionText: { fontSize: 13, color: "#555", marginBottom: 4 },
  variationRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  variationName: { fontSize: 13, color: "#333" },
  variationPrice: { fontSize: 13, color: "darkred", fontWeight: "500" },

  feedbackContainer: { marginTop: 20 },
  feedbackTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  noFeedback: { color: "#888", fontStyle: "italic" },
  feedbackCard: { backgroundColor: "#f9f9f9", padding: 10, borderRadius: 6, marginBottom: 10 },
  feedbackHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  profileImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  profilePlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#ccc", alignItems: "center", justifyContent: "center", marginRight: 10 },
  profileInitials: { color: "#fff", fontWeight: "bold" },
  feedbackUser: { fontWeight: "600" },
  feedbackRating: { color: "#A40C2D" },
  feedbackComment: { color: "#333", marginVertical: 3 },
  feedbackDate: { fontSize: 12, color: "#888" },
});
