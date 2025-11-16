import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Image,
  Modal,
} from "react-native";
import api from "../libs/apiCall";
import useStore from "../store";
import { z } from "zod";
import * as ImagePicker from "expo-image-picker";
import { useToast } from "../contexts/ToastContext";


// ✅ Zod schemas
const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  contact_number: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "Contact number must be 11 digits")
    .or(z.literal("")),
  messenger_link: z
    .string()
    .trim()
    .max(255, "Messenger/Facebook link is too long")
    .or(z.literal("")),
  profile_image_url: z
    .string()
    .url("Invalid image URL")
    .optional()
    .or(z.literal("")),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const Profile = () => {
  const logout = useStore((state) => state.signOut);
  const { user, setCredentials } = useStore();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    contact_number: "",
    messenger_link: "",
    profile_image_url: "",
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "contact" | "password">("profile");
  const { showToast } = useToast();

  const handleLogout = () => {
    setLogoutConfirmVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutConfirmVisible(false);
    await logout();
  };
    const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setProfile({ ...profile, profile_image_url: asset.uri }); // local preview
    }
  };


  const token = user?.token;

  // Fetch user profile
  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!token) return;
        setLoading(true);
        const res = await api.get("/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const u = res.data.user || res.data;
        setProfile({
          first_name: u.first_name || "",
          last_name: u.last_name || "",
          email: u.email || "",
          contact_number: u.contact_number || "",
          messenger_link: u.messenger_link || "",
          profile_image_url: u.profile_image_url
            ? (u.profile_image_url.startsWith("data:") ? u.profile_image_url : String(u.profile_image_url))
            : "",
        });

      } catch (error) {
        console.error("Error fetching user:", error);
        showToast("error", "Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchUser();
  }, [user, token]);


  const handleUpdateProfile = async () => {
    const validation = profileSchema.safeParse(profile);
    if (!validation.success) {
      const fieldErrors: any = {};
      validation.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setErrors({});
      setLoading(true);

      const formData = new FormData();
      formData.append("first_name", profile.first_name);
      formData.append("last_name", profile.last_name);
      formData.append("contact_number", profile.contact_number || "");
      formData.append("messenger_link", profile.messenger_link || "");

      if (profile.profile_image_url && !profile.profile_image_url.startsWith("http")) {
        // only append if it's a new picked image (local file)
        formData.append("profile_image", {
          uri: profile.profile_image_url,
          name: "profile.jpg",
          type: "image/jpeg",
        } as any);
      }

      const res = await api.put("/user/profile", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      await setCredentials({ ...res.data.user, token: user.token });

      showToast("success", "Profile updated successfully");
    } catch (err: any) {
      console.error("Error updating profile:", err);
      if (err.response?.data?.message) {
        showToast("error", err.response.data.message);
      } else {
        showToast("error", "Failed to update profile");
      }
    } finally {
      setLoading(false);
    }
  };


  // ✅ Password update
  const handleChangePassword = async () => {
    const validation = passwordSchema.safeParse(passwords);
    if (!validation.success) {
      const fieldErrors: any = {};
      validation.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setErrors({});
      setLoading(true);
      await api.put(`/user/change-password/${user.id}`, passwords, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast("success", "Password updated successfully");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      console.error("Error changing password:", err);

      // 🔥 Show backend error messages
      if (err.response?.data?.message) {
        showToast("error", err.response.data.message);
      } else {
        showToast("error", "Failed to change password");
      }
    } finally {
      setLoading(false);
    }
  };



  if (!user) return null;

  const tabs: { key: "profile" | "contact" | "password"; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "contact", label: "Contact" },
    { key: "password", label: "Password" },
  ];

  const primaryActionLabel =
    activeTab === "profile"
      ? "Save Profile"
      : activeTab === "contact"
      ? "Save Contact"
      : "Change Password";

  const primaryActionHandler =
    activeTab === "password" ? handleChangePassword : handleUpdateProfile;

  return (
    <View style={styles.screen}>
      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#A40C2D" />
        </View>
      )}

      <ScrollView style={styles.container}>
        {/* Header Card with Profile Image */}
        <View style={styles.headerCard}>
          <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
            {profile.profile_image_url ? (
              <Image
                source={{ uri: String(profile.profile_image_url) }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>👤</Text>
                <Text style={styles.imagePlaceholderLabel}>Tap to add photo</Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Text style={styles.cameraIconText}>📷</Text>
            </View>
          </TouchableOpacity>
          
          <Text style={styles.userName}>
            {profile.first_name} {profile.last_name}
          </Text>
          
          <View style={styles.userBadge}>
            <Text style={styles.userBadgeText}>
              {user?.role === 'concessionaire' ? 'Concessionaire' : 'Customer'}
            </Text>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                activeTab === tab.key && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Profile Information Card */}
        {activeTab === "profile" && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>👤 Personal Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={profile.first_name}
                onChangeText={(t) => setProfile({ ...profile, first_name: t })}
                placeholder="Enter your first name"
              />
              {errors.first_name && (
                <Text style={styles.error}>{errors.first_name}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={profile.last_name}
                onChangeText={(t) => setProfile({ ...profile, last_name: t })}
                placeholder="Enter your last name"
              />
              {errors.last_name && (
                <Text style={styles.error}>{errors.last_name}</Text>
              )}
            </View>
          </View>
        )}

        {/* Contact Information Card */}
        {activeTab === "contact" && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>📞 Contact Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                editable={false}
                value={profile.email}
                placeholder="Email address"
              />
              <Text style={styles.helperText}>Email cannot be changed</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={profile.contact_number}
                onChangeText={(t) =>
                  setProfile({ ...profile, contact_number: t })
                }
                placeholder="09XXXXXXXXX"
              />
              {errors.contact_number && (
                <Text style={styles.error}>{errors.contact_number}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Messenger/Facebook Link</Text>
              <TextInput
                style={styles.input}
                keyboardType="url"
                autoCapitalize="none"
                value={profile.messenger_link}
                onChangeText={(t) =>
                  setProfile({ ...profile, messenger_link: t })
                }
                placeholder="m.me/john.doe.2024"
              />
              {errors.messenger_link && (
                <Text style={styles.error}>{errors.messenger_link}</Text>
              )}
              <Text style={styles.helperText}>
                Optional: Add your Messenger link for easy contact
              </Text>
            </View>
          </View>
        )}

        {/* Security Card */}
        {activeTab === "password" && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>🔒 Security</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={passwords.currentPassword}
                onChangeText={(t) =>
                  setPasswords({ ...passwords, currentPassword: t })
                }
                placeholder="Enter current password"
              />
              {errors.currentPassword && (
                <Text style={styles.error}>{errors.currentPassword}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={passwords.newPassword}
                onChangeText={(t) =>
                  setPasswords({ ...passwords, newPassword: t })
                }
                placeholder="Enter new password"
              />
              {errors.newPassword && (
                <Text style={styles.error}>{errors.newPassword}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={passwords.confirmPassword}
                onChangeText={(t) =>
                  setPasswords({ ...passwords, confirmPassword: t })
                }
                placeholder="Confirm new password"
              />
              {errors.confirmPassword && (
                <Text style={styles.error}>{errors.confirmPassword}</Text>
              )}
              <Text style={styles.helperText}>
                Password must be at least 6 characters long
              </Text>
            </View>
          </View>
        )}

        {/* Bottom spacing for fixed buttons */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.bottomButton, styles.bottomSecondaryButton]}
          onPress={handleLogout}
        >
          <Text style={styles.bottomSecondaryText}>Logout</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bottomButton, styles.bottomPrimaryButton]}
          onPress={primaryActionHandler}
        >
          <Text style={styles.bottomPrimaryText}>{primaryActionLabel}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        transparent
        visible={logoutConfirmVisible}
        animationType="fade"
        onRequestClose={() => setLogoutConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to log out?
            </Text>
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setLogoutConfirmVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmLogout}
              >
                <Text style={styles.modalConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default Profile;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
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
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#A40C2D",
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f3f4f6",
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    fontSize: 40,
    marginBottom: 4,
  },
  imagePlaceholderLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#A40C2D",
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  cameraIconText: {
    fontSize: 14,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 8,
  },
  userBadge: {
    backgroundColor: "#A40C2D",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  userBadgeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#A40C2D",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "600",
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
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#1f2937",
  },
  disabledInput: {
    backgroundColor: "#f9fafb",
    color: "#6b7280",
  },
  error: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  helperText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  bottomSpacing: {
    height: 100,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  bottomButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSecondaryButton: {
    marginRight: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  bottomPrimaryButton: {
    marginLeft: 8,
    backgroundColor: "#A40C2D",
  },
  bottomPrimaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  bottomSecondaryText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  modalConfirmButton: {
    backgroundColor: "#dc2626",
  },
  modalCancelText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 14,
  },
  modalConfirmText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
