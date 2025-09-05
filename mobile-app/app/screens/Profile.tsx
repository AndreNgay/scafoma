import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import api from "../libs/apiCall";
import useStore from "../store";
import { z } from "zod";

// ✅ Zod schemas
const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  profile_image_url: z.string().url("Invalid image URL").optional().or(z.literal("")),
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
    profile_image_url: "",
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });


  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout(); // clears AsyncStorage + Zustand user
        },
      },
    ]);
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
          profile_image_url: u.profile_image_url || "",
        });
      } catch (error) {
        console.error("Error fetching user:", error);
        Alert.alert("Error", "Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchUser();
  }, [user, token]);

  // ✅ Profile update
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
      const res = await api.put("/user/profile", profile, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await setCredentials({
        ...res.data.user,
        token: user.token,
      });

      Alert.alert("Success", "Profile updated successfully");
    } catch (err: any) {
      console.error("Error updating profile:", err);

      // 🔥 Show backend error
      if (err.response?.data?.message) {
        Alert.alert("Error", err.response.data.message);
      } else {
        Alert.alert("Error", "Failed to update profile");
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

      Alert.alert("Success", "Password updated successfully");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      console.error("Error changing password:", err);

      // 🔥 Show backend error messages
      if (err.response?.data?.message) {
        Alert.alert("Error", err.response.data.message);
      } else {
        Alert.alert("Error", "Failed to change password");
      }
    } finally {
      setLoading(false);
    }
  };



  if (!user) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="darkred" />
        </View>
      )}

      {/* Profile Image */}
      <View style={styles.imageContainer}>
        {profile.profile_image_url ? (
          <Image source={{ uri: profile.profile_image_url }} style={styles.profileImage} />
        ) : (
          <View style={[styles.profileImage, styles.imagePlaceholder]}>
            <Text style={{ color: "#666" }}>No Image</Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Profile Information</Text>

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

      <Text style={styles.label}>Email</Text>
      <TextInput style={[styles.input, { backgroundColor: "#eee" }]} editable={false} value={profile.email} />
      {errors.email && <Text style={styles.error}>{errors.email}</Text>}


      <TouchableOpacity style={styles.button} onPress={handleUpdateProfile}>
        <Text style={styles.buttonText}>Save Profile</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Change Password</Text>

      <Text style={styles.label}>Current Password</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={passwords.currentPassword}
        onChangeText={(t) => setPasswords({ ...passwords, currentPassword: t })}
      />
      {errors.currentPassword && <Text style={styles.error}>{errors.currentPassword}</Text>}

      <Text style={styles.label}>New Password</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={passwords.newPassword}
        onChangeText={(t) => setPasswords({ ...passwords, newPassword: t })}
      />
      {errors.newPassword && <Text style={styles.error}>{errors.newPassword}</Text>}

      <Text style={styles.label}>Confirm New Password</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={passwords.confirmPassword}
        onChangeText={(t) => setPasswords({ ...passwords, confirmPassword: t })}
      />
      {errors.confirmPassword && <Text style={styles.error}>{errors.confirmPassword}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
        <Text style={styles.buttonText}>Change Password</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: "gray" }]} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f9f9f9",
    flexGrow: 1,
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
});
