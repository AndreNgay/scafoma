// src/pages/Profile.jsx
import React, {useEffect, useState} from "react";
import axios from "axios";

export const Profile = () => {
    const [user,
        setUser] = useState(null);
    const [formData,
        setFormData] = useState({first_name: "", last_name: "", contact_number: "", profile_image_url: ""});
    const [passwordData,
        setPasswordData] = useState({currentPassword: "", newPassword: "", confirmPassword: ""});
    const [loading,
        setLoading] = useState(false);
    const [message,
        setMessage] = useState("");

    const token = localStorage.getItem("token");

    // Fetch user
    useEffect(() => {
        const fetchUser = async() => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    console.log("No token found");
                    return;
                }

                const res = await axios.get("/api-v1/user", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                // If backend sends { user: { ... } }
                if (res.data.user) {
                    setUser(res.data.user// If backend sends { ...userData }
                    );
                } else {
                    setUser(res.data);
                }
            } catch (err) {
                console.error("Error fetching user:", err);
            }
        };

        fetchUser();
    }, []);

    // Handle update profile
    const handleSave = async() => {
        try {
            setLoading(true);
            const res = await axios.put(`/api-v1/user/${user.id}`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setMessage(res.data.message);
            setUser(res.data.user);
        } catch (err) {
            console.error("Error updating profile:", err);
            setMessage("Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    // Handle password change
    const handleChangePassword = async() => {
        try {
            setLoading(true);
            const res = await axios.put("/api-v1/user/change-password", passwordData, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setMessage(res.data.message);
            setPasswordData({currentPassword: "", newPassword: "", confirmPassword: ""});
        } catch (err) {
            console.error("Error changing password:", err);
            setMessage("Failed to change password");
        } finally {
            setLoading(false);
        }
    };

    if (!user) 
        return <div className="p-6">Loading...</div>;
    
    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">My Profile</h1>

            {message && <div className="mb-4 text-green-600">{message}</div>}

            {/* Profile Info */}
            <div className="bg-white shadow-md rounded-2xl p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Profile Information</h2>

                {/* Profile Image */}
                <div className="flex items-center gap-4 mb-4">
                    <img
                        src={formData.profile_image_url || "/default-avatar.png"}
                        alt="Profile"
                        className="w-20 h-20 rounded-full border"/>
                    <input
                        type="text"
                        placeholder="Profile Image URL"
                        value={formData.profile_image_url}
                        onChange={(e) => setFormData({
                        ...formData,
                        profile_image_url: e.target.value
                    })}
                        className="flex-1 border p-2 rounded-lg"/>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="First Name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({
                        ...formData,
                        first_name: e.target.value
                    })}
                        className="border p-2 rounded-lg"/>
                    <input
                        type="text"
                        placeholder="Last Name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({
                        ...formData,
                        last_name: e.target.value
                    })}
                        className="border p-2 rounded-lg"/>
                    <input
                        type="text"
                        placeholder="Contact Number"
                        value={formData.contact_number}
                        onChange={(e) => setFormData({
                        ...formData,
                        contact_number: e.target.value
                    })}
                        className="border p-2 rounded-lg col-span-2"/>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    {loading
                        ? "Saving..."
                        : "Save Changes"}
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
                        onChange={(e) => setPasswordData({
                        ...passwordData,
                        currentPassword: e.target.value
                    })}
                        className="border p-2 rounded-lg"/>
                    <input
                        type="password"
                        placeholder="New Password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({
                        ...passwordData,
                        newPassword: e.target.value
                    })}
                        className="border p-2 rounded-lg"/>
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({
                        ...passwordData,
                        confirmPassword: e.target.value
                    })}
                        className="border p-2 rounded-lg col-span-2"/>
                </div>

                <button
                    onClick={handleChangePassword}
                    disabled={loading}
                    className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                    {loading
                        ? "Updating..."
                        : "Change Password"}
                </button>
            </div>
        </div>
    );
};

export default Profile;
