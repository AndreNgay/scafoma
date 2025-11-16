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
  Linking,
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
    .max(255, "Messenger link is too long")
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

  const openMessengerLink = async () => {
    const raw = profile.messenger_link?.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        showToast("error", "Cannot open the provided Messenger link.");
        return;
      }
      await Linking.openURL(url);
    } catch (err) {
      console.error("Error opening messenger link:", err);
      showToast("error", "Failed to open Messenger link.");
    }
  };

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="darkred" />
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
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

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <>
          <View style={styles.imageContainer}>
            <TouchableOpacity onPress={pickImage}>
              {profile.profile_image_url ? (
                <Image
                  source={{ uri: String(profile.profile_image_url) }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.profileImage, styles.imagePlaceholder]}>
                  <Text style={{ color: "#666" }}>Pick Image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Profile</Text>

          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            value={profile.first_name}
            onChangeText={(t) => setProfile({ ...profile, first_name: t })}
          />
          {errors.first_name && <Text style={styles.error}>{errors.first_name}</Text>}

          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            value={profile.last_name}
            onChangeText={(t) => setProfile({ ...profile, last_name: t })}
          />
          {errors.last_name && <Text style={styles.error}>{errors.last_name}</Text>}

          <TouchableOpacity style={styles.button} onPress={handleUpdateProfile}>
            <Text style={styles.buttonText}>Save Profile</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Contact Tab */}
      {activeTab === "contact" && (
        <>
          <Text style={styles.sectionTitle}>Contact</Text>

          <Text style={styles.label}>Contact Number</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={profile.contact_number}
            onChangeText={(t) => setProfile({ ...profile, contact_number: t })}
          />
          {errors.contact_number && (
            <Text style={styles.error}>{errors.contact_number}</Text>
          )}

          <Text style={styles.label}>Messenger Link</Text>
          <TextInput
            style={styles.input}
            keyboardType="url"
            autoCapitalize="none"
            value={profile.messenger_link}
            onChangeText={(t) => setProfile({ ...profile, messenger_link: t })}
          />
          {errors.messenger_link && (
            <Text style={styles.error}>{errors.messenger_link}</Text>
          )}

          {profile.messenger_link?.trim() ? (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={openMessengerLink}
            >
              <Text style={styles.linkButtonText}>Open Messenger Link</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: "#eee" }]}
            editable={false}
            value={profile.email}
          />
          {errors.email && <Text style={styles.error}>{errors.email}</Text>}

          <TouchableOpacity style={styles.button} onPress={handleUpdateProfile}>
            <Text style={styles.buttonText}>Save Contact</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Password Tab */}
      {activeTab === "password" && (
        <>
          <Text style={styles.sectionTitle}>Change Password</Text>

          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={passwords.currentPassword}
            onChangeText={(t) =>
              setPasswords({ ...passwords, currentPassword: t })
            }
          />
          {errors.currentPassword && (
            <Text style={styles.error}>{errors.currentPassword}</Text>
          )}

          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={passwords.newPassword}
            onChangeText={(t) =>
              setPasswords({ ...passwords, newPassword: t })
            }
          />
          {errors.newPassword && (
            <Text style={styles.error}>{errors.newPassword}</Text>
          )}

          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={passwords.confirmPassword}
            onChangeText={(t) =>
              setPasswords({ ...passwords, confirmPassword: t })
            }
          />
          {errors.confirmPassword && (
            <Text style={styles.error}>{errors.confirmPassword}</Text>
          )}

          <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
            <Text style={styles.buttonText}>Change Password</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Logout (global) */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: "gray" }]}
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>

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
    </ScrollView>
  );
}

export default Profile;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f9f9f9",
    flexGrow: 1,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "darkred",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginVertical: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
    color: "#444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
    backgroundColor: "#fff",
  },
  error: {
    color: "red",
    fontSize: 12,
    marginBottom: 8,
  },
  button: {
    backgroundColor: "darkred",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  imagePlaceholder: {
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  linkButton: {
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#1877F2",
    alignItems: "center",
  },
  linkButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  toastContainer: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  toastSuccess: {
    backgroundColor: "#4caf50",
  },
  toastError: {
    backgroundColor: "#f44336",
  },
  toastInfo: {
    backgroundColor: "#333",
  },
  toastText: {
    color: "#fff",
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 14,
    color: "#555",
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  modalCancelButton: {
    backgroundColor: "#eee",
  },
  modalConfirmButton: {
    backgroundColor: "darkred",
  },
  modalCancelText: {
    color: "#333",
    fontWeight: "500",
  },
  modalConfirmText: {
    color: "#fff",
    fontWeight: "600",
  },
});
