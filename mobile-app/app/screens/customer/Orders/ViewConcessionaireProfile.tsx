import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import api from "../../../libs/apiCall";

const ViewConcessionaireProfile = () => {
  const route = useRoute<any>();
  const { concessionId } = route.params;

  const [concession, setConcession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch concession profile
  const fetchConcessionProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/concession/${concessionId}`);
      setConcession(res.data.data || res.data);
    } catch (err) {
      console.error("Error fetching concession profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConcessionProfile();
  }, [concessionId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#A40C2D" />
      </View>
    );
  }

  if (!concession) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Concessionaire not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Image */}
      <View style={styles.imageContainer}>
        {concession.image_url ? (
          <Image source={{ uri: concession.image_url }} style={styles.profileImage} />
        ) : (
          <View style={styles.profilePlaceholder}>
            <Text style={styles.profileInitials}>
              {concession.concession_name?.[0] || "C"}
            </Text>
          </View>
        )}
      </View>

      {/* Concession Name */}
      <Text style={styles.concessionName}>
        {concession.concession_name}
      </Text>

      {/* Cafeteria */}
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Cafeteria:</Text>
        <Text style={styles.infoValue}>{concession.cafeteria_name}</Text>
      </View>

      {/* Location */}
      {concession.location && (
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Location:</Text>
          <Text style={styles.infoValue}>{concession.location}</Text>
        </View>
      )}

      {/* Status */}
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Status:</Text>
        <Text style={[
          styles.infoValue,
          concession.status === 'open' ? styles.statusOpen : styles.statusClosed
        ]}>
          {concession.status?.toUpperCase() || 'UNKNOWN'}
        </Text>
      </View>

      {/* Payment Methods */}
      <Text style={styles.sectionHeader}>Payment Methods</Text>
      
      {concession.gcash_payment_available && (
        <View style={styles.paymentMethod}>
          <Text style={styles.paymentText}>
            💳 GCash {concession.gcash_number ? `(${concession.gcash_number})` : ''}
          </Text>
        </View>
      )}
      
      {concession.oncounter_payment_available && (
        <View style={styles.paymentMethod}>
          <Text style={styles.paymentText}>💰 On-Counter Payment</Text>
        </View>
      )}

      {!concession.gcash_payment_available && !concession.oncounter_payment_available && (
        <Text style={styles.noPaymentText}>No payment methods available</Text>
      )}

      {/* Created Date */}
      {concession.created_at && (
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Member Since:</Text>
          <Text style={styles.infoValue}>
            {new Date(concession.created_at).toLocaleDateString()}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profilePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#A40C2D",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitials: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "bold",
  },
  concessionName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#A40C2D",
    textAlign: "center",
    marginBottom: 30,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#A40C2D",
    marginTop: 20,
    marginBottom: 10,
  },
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: "#666",
    flex: 1,
    textAlign: "right",
  },
  statusOpen: {
    color: "#28a745",
    fontWeight: "600",
  },
  statusClosed: {
    color: "#dc3545",
    fontWeight: "600",
  },
  paymentMethod: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  paymentText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  noPaymentText: {
    fontSize: 14,
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 20,
  },
});

export default ViewConcessionaireProfile;