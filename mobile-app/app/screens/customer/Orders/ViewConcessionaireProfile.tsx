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
  const { concessionaireId, concessionaireData } = route.params;

  const [concessionaire, setConcessionaire] = useState<any>(concessionaireData || null);
  const [loading, setLoading] = useState(!concessionaireData);

  // Fetch concessionaire profile if not provided
  const fetchConcessionaireProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/user/${concessionaireId}`);
      setConcessionaire(res.data);
    } catch (err) {
      console.error("Error fetching concessionaire profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!concessionaire && concessionaireId) {
      fetchConcessionaireProfile();
    }
  }, [concessionaireId, concessionaire]);

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
      {/* Header Card */}
      <View style={styles.headerCard}>
        {/* Profile Image */}
        <View style={styles.imageContainer}>
          {concessionaire.profile_image_url ? (
            <Image source={{ uri: concessionaire.profile_image_url }} style={styles.profileImage} />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileInitials}>
                {concessionaire.first_name?.[0] || ""}{concessionaire.last_name?.[0] || ""}
              </Text>
            </View>
          )}
        </View>

        {/* Concessionaire Name */}
        <Text style={styles.concessionaireName}>
          {concessionaire.first_name} {concessionaire.last_name}
        </Text>
        
        {/* Concessionaire Badge */}
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>Concessionaire</Text>
        </View>
        
        {/* Member Since Badge */}
        {concessionaire.created_at && (
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>
              Member since {new Date(concessionaire.created_at).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {/* Contact Information Card */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>📞 Contact Information</Text>
        
        <View style={styles.infoItem}>
          <View style={styles.infoIcon}>
            <Text style={styles.iconText}>📧</Text>
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{concessionaire.email}</Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <View style={styles.infoIcon}>
            <Text style={styles.iconText}>📱</Text>
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>
              {concessionaire.contact_number || "Not provided"}
            </Text>
          </View>
        </View>

        {concessionaire.messenger_link && (
          <TouchableOpacity
            style={styles.infoItem}
            onPress={async () => {
              const raw = String(concessionaire.messenger_link).trim();
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
            <View style={styles.infoIcon}>
              <Text style={styles.iconText}>💬</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Messenger/Facebook</Text>
              <Text style={[styles.infoValue, styles.linkText]} numberOfLines={1}>
                {concessionaire.messenger_link}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Business Information Card */}
      {concessionaire.concession_name && (
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>🏢 Business Information</Text>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Text style={styles.iconText}>🏪</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Concession</Text>
              <Text style={styles.infoValue}>{concessionaire.concession_name}</Text>
            </View>
          </View>
          
          {concessionaire.cafeteria_name && (
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Text style={styles.iconText}>🏭</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Cafeteria</Text>
                <Text style={styles.infoValue}>{concessionaire.cafeteria_name}</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerCard: {
    backgroundColor: "#fff",
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  imageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#A40C2D",
  },
  profilePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#A40C2D",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#A40C2D",
  },
  profileInitials: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
  },
  concessionaireName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: "#A40C2D",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  memberBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  memberBadgeText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  infoCard: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "500",
  },
  linkText: {
    color: "#2563eb",
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 20,
  },
});

export default ViewConcessionaireProfile;