import React from "react";
import { View, Text, StyleSheet, Image, ScrollView } from "react-native";
import { useRoute } from "@react-navigation/native";

const ViewConcession = () => {
  const route = useRoute<any>();
  const { concession } = route.params; // concession info passed from MenuItemDetails

  return (
    <ScrollView style={styles.container}>
      {/* Image */}
      {concession.image_url ? (
        <Image source={{ uri: concession.image_url }} style={styles.image} />
      ) : (
        <View style={styles.placeholder} />
      )}

      {/* Concession Info */}
      <Text style={styles.concessionName}>{concession.concession_name}</Text>
      <Text style={styles.subText}>
        {concession.cafeteria_name} • {concession.location}
      </Text>

      {/* Payment Methods */}
      <Text style={styles.sectionHeader}>Available Payments</Text>
      {concession.gcash_payment_available && (
        <Text style={styles.paymentText}>
          ✅ GCash {concession.gcash_number ? `(${concession.gcash_number})` : ""}
        </Text>
      )}
      {concession.oncounter_payment_available && (
        <Text style={styles.paymentText}>✅ On-Counter</Text>
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
  concessionName: { fontSize: 20, fontWeight: "bold", color: "#A40C2D" },
  subText: { fontSize: 14, color: "#555", marginTop: 3 },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
    color: "#A40C2D",
  },
  paymentText: { fontSize: 14, marginBottom: 5 },
});

export default ViewConcession;
