import React from "react";
import { View, Text, StyleSheet, Image, ScrollView } from "react-native";

const ViewConcession = () => {
  // Mock concession data for prototype
  const concession = {
    concession_name: "Sample Concession",
    cafeteria_name: "Cafeteria A",
    location: "Ground Floor, Main Building",
    image_url:
      "https://cdn.prod.website-files.com/604a97c70aee09eed25ce991/61aa4e4b46409e674cf8c773_zelIDNbUG5b1u26i3RRCfXDZ8SLP3wPJ1637612723.jpg",
    gcash_payment_available: true,
    gcash_number: "09123456789",
    oncounter_payment_available: true,
  };

  return (
    <ScrollView style={styles.container}>
      {/* Static Image */}
      <Image source={{ uri: concession.image_url }} style={styles.image} />

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
