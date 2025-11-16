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

const ViewCustomerProfile = () => {
  const route = useRoute<any>();
  const { customerId } = route.params;

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch customer profile
  const fetchCustomerProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/user/${customerId}`);
      // Handle both formats: { user: {...} } or direct user object
      setCustomer(res.data.user || res.data);
    } catch (err) {
      console.error("Error fetching customer profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerProfile();
  }, [customerId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#A40C2D" />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Customer not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Image */}
      <View style={styles.imageContainer}>
        {customer.profile_image_url ? (
          <Image source={{ uri: customer.profile_image_url }} style={styles.profileImage} />
        ) : (
          <View style={styles.profilePlaceholder}>
            <Text style={styles.profileInitials}>
              {customer.first_name?.[0]}{customer.last_name?.[0]}
            </Text>
          </View>
        )}
      </View>

      {/* Customer Name */}
      <Text style={styles.customerName}>
        {customer.first_name} {customer.last_name}
      </Text>

      {/* Email */}
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Email:</Text>
        <Text style={styles.infoValue}>{customer.email}</Text>
      </View>

      {/* Contact Number */}
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Contact Number:</Text>
        <Text style={styles.infoValue}>
          {customer.contact_number || "Not provided"}
        </Text>
      </View>

      {/* Messenger/Facebook Link */}
      {customer.messenger_link ? (
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Messenger/Facebook:</Text>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={async () => {
              const raw = String(customer.messenger_link).trim();
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
            }}
          >
            <Text
              style={[
                styles.infoValue,
                { textAlign: "right", color: "#1d4ed8" },
              ]}
              numberOfLines={1}
            >
              {customer.messenger_link}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Role */}
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Role:</Text>
        <Text style={styles.infoValue}>{customer.role}</Text>
      </View>

      {/* Profile Created Date */}
      {customer.created_at && (
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Member Since:</Text>
          <Text style={styles.infoValue}>
            {new Date(customer.created_at).toLocaleDateString()}
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
  customerName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#A40C2D",
    textAlign: "center",
    marginBottom: 30,
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

export default ViewCustomerProfile;

