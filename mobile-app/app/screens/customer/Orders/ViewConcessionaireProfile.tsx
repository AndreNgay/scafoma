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
  const { concessionaireId } = route.params;

  const [concessionaire, setConcessionaire] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch concessionaire profile (concession details + user info)
  const fetchConcessionaireProfile = async () => {
    try {
      setLoading(true);
      // Concession details
      const concessionRes = await api.get(`/concession/${concessionaireId}`);
      const concession = concessionRes.data.data || concessionRes.data;
      // Concessionaire user info
      const userRes = await api.get(`/user/${concession.concessionaire_id}`);
      const user = userRes.data.user || userRes.data;
      setConcessionaire({ ...concession, ...user });
    } catch (err) {
      console.error("Error fetching concessionaire profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConcessionaireProfile();
  }, [concessionaireId]);

  const openMessengerLink = async (link: string) => {
    const raw = String(link).trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (err) {
      console.error("Error opening messenger/facebook link:", err);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#A40C2D" />
      </View>
    );
  }

  if (!concessionaire) {
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
        {concessionaire.image_url ? (
          <Image source={{ uri: concessionaire.image_url }} style={styles.profileImage} />
        ) : (
          <View style={styles.profilePlaceholder}>
            <Text style={styles.profileInitials}>
              {concessionaire.first_name?.[0]}{concessionaire.last_name?.[0]}
            </Text>
          </View>
        )}
      </View>

      {/* Concessionaire Name */}
      <Text style={styles.concessionaireName}>
        {concessionaire.first_name} {concessionaire.last_name}
      </Text>
      <Text style={styles.concessionName}>{concessionaire.concession_name}</Text>
      {concessionaire.cafeteria_name && (
        <Text style={styles.subText}>{concessionaire.cafeteria_name} {concessionaire.location ? `• ${concessionaire.location}` : ""}</Text>
      )}

      {/* Email */}
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Email:</Text>
        <Text style={styles.infoValue}>{concessionaire.email}</Text>
      </View>

      {/* Contact Number */}
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Contact Number:</Text>
        <Text style={styles.infoValue}>
          {concessionaire.contact_number || "Not provided"}
        </Text>
      </View>

      {/* Messenger/Facebook Link */}
      {concessionaire.messenger_link ? (
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Messenger/Facebook:</Text>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => openMessengerLink(concessionaire.messenger_link)}
          >
            <Text
              style={[
                styles.infoValue,
                { textAlign: "right", color: "#1d4ed8" },
              ]}
              numberOfLines={1}
            >
              {concessionaire.messenger_link}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* GCash */}
      {concessionaire.gcash_payment_available && (
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>GCash Number:</Text>
          <Text style={styles.infoValue}>
            {concessionaire.gcash_number || "Not provided"}
          </Text>
        </View>
      )}

      {/* Status */}
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Status:</Text>
        <Text style={styles.infoValue}>
          {concessionaire.status ? concessionaire.status.toUpperCase() : "UNKNOWN"}
        </Text>
      </View>

      {/* Member Since */}
      {concessionaire.created_at && (
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Member Since:</Text>
          <Text style={styles.infoValue}>
            {new Date(concessionaire.created_at).toLocaleDateString()}
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
  concessionaireName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#A40C2D",
    textAlign: "center",
    marginBottom: 5,
  },
  concessionName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 5,
  },
  subText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
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
  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 20,
  },
});

export default ViewConcessionaireProfile;