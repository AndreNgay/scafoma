// src/pages/Profile.jsx
import React, { useEffect, useState, useRef } from "react";
import api from "../libs/apiCall.js";
import { toast } from "sonner";
import { z } from "zod";

// ✅ Define Zod schemas
const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  contact_number: z
    .string()
    .min(10, "Contact number must be at least 10 digits")
    .max(15, "Contact number must not exceed 15 digits")
    .regex(/^[0-9]+$/, "Contact number must only contain digits"),
  profile_image_url: z.string().url().optional().or(z.literal("")),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const Profile = () => {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    contact_number: "",
    profile_image_url: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const fileInputRef = useRef(null);

  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!token) return;

        const res = await api.get("/user", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userData = res.data.user || res.data;
        setUser(userData);

        setFormData({
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          contact_number: userData.contact_number || "",
          profile_image_url: userData.profile_image_url || "",
        });
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };

    fetchUser();
  }, [token]);

  // Handle update profile with validation
  const handleSave = async () => {
    try {
      const validatedData = profileSchema.parse(formData); // ✅ validate before API call
      setLoading(true);

      const res = await api.put(`/user/profile`, validatedData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(res.data.user);
      toast.success(res.data.message || "Profile updated successfully!");
    } catch (err) {
      if (err instanceof z.ZodError) {
        err.errors.forEach((e) => toast.error(e.message));
      } else {
        console.error("Error updating profile:", err);
        toast.error("Failed to update profile");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle password change with validation
  const handleChangePassword = async () => {
    try {
      const validatedData = passwordSchema.parse(passwordData); // ✅ validate before API call
      setLoading(true);

      const res = await api.put(
        `/user/change-password/${user.id}`,
        validatedData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(res.data.message || "Password changed successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        err.errors.forEach((e) => toast.error(e.message));
      } else {
        console.error("Error changing password:", err);
        toast.error(err.response?.data?.message || "Failed to change password");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle image upload
  const handleImageClick = () => fileInputRef.current.click();

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append("profile_image", file);

    try {
      setLoading(true);
      const res = await api.post(
        `/user/${user.id}/upload-profile`,
        formDataUpload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setFormData({
        ...formData,
        profile_image_url: res.data.profile_image_url,
      });
      setUser({ ...user, profile_image_url: res.data.profile_image_url });
      toast.success("Profile picture updated!");
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error("Failed to upload image");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>

      {/* Profile Info */}
      <div className="bg-white shadow-md rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Profile Information</h2>

        <div className="flex items-center gap-4 mb-4">
          <img
            src={formData.profile_image_url || "/default-avatar.png"}
            alt="Profile"
            className="w-20 h-20 rounded-full border cursor-pointer hover:opacity-80"
            onClick={handleImageClick}
          />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="First Name"
            value={formData.first_name}
            onChange={(e) =>
              setFormData({ ...formData, first_name: e.target.value })
            }
            className="border p-2 rounded-lg"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={formData.last_name}
            onChange={(e) =>
              setFormData({ ...formData, last_name: e.target.value })
            }
            className="border p-2 rounded-lg"
          />
          <input
            type="text"
            placeholder="Contact Number"
            value={formData.contact_number}
            onChange={(e) =>
              setFormData({ ...formData, contact_number: e.target.value })
            }
            className="border p-2 rounded-lg col-span-2"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Change Password */}
      <div className="bg-white shadow-md rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Change Password</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="password"
            placeholder="Current Password"
            value={passwordData.currentPassword}
            onChange={(e) =>
              setPasswordData({
                ...passwordData,
                currentPassword: e.target.value,
              })
            }
            className="border p-2 rounded-lg"
          />
          <input
            type="password"
            placeholder="New Password"
            value={passwordData.newPassword}
            onChange={(e) =>
              setPasswordData({ ...passwordData, newPassword: e.target.value })
            }
            className="border p-2 rounded-lg"
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={passwordData.confirmPassword}
            onChange={(e) =>
              setPasswordData({
                ...passwordData,
                confirmPassword: e.target.value,
              })
            }
            className="border p-2 rounded-lg col-span-2"
          />
        </div>

        <button
          onClick={handleChangePassword}
          disabled={loading}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          {loading ? "Updating..." : "Change Password"}
        </button>
      </div>
    </div>
  );
};

export default Profile;
