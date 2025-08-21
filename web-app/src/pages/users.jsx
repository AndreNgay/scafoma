import React, {useState, useEffect} from 'react';
import {toast} from 'sonner';
import api from "../libs/apiCall.js";
import {z} from "zod";

// Zod schema for validation
const UserSchema = z.object({
    first_name: z
        .string()
        .min(1, {message: "First name is required"}),
    last_name: z
        .string()
        .min(1, {message: "Last name is required"}),
    email: z
        .string()
        .email({message: "Invalid email address"}),
    role: z.enum([
        "admin", "staff", "customer"
    ], {message: "Role is required"})
});

export const Users = () => {
    const [users,
        setUsers] = useState([]);
    const [isLoading,
        setIsLoading] = useState(true);
    const [isModalOpen,
        setIsModalOpen] = useState(false);
    const [editingUser,
        setEditingUser] = useState(null);
    const [formData,
        setFormData] = useState({first_name: "", last_name: "", email: "", role: ""});
    const [loading,
        setLoading] = useState(false);

    const fetchUsers = async() => {
        try {
            const {data} = await api.get('/user/all');
            setUsers(data.users || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to fetch users. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleEditClick = (user) => {
        setEditingUser(user);
        setFormData({first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role});
        setIsModalOpen(true);
    };

    const handleInputChange = (e) => {
        const {name, value} = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleUpdateUser = async(e) => {
        e.preventDefault();

        // Validate form
        const result = UserSchema.safeParse(formData);
        if (!result.success) {
            const errorMessages = result
                .error
                .errors
                .map(err => err.message)
                .join("\n");
            toast.error(errorMessages);
            return;
        }

        try {
            setLoading(true);
            await api.put(`/user/${editingUser.id}`, formData);
            toast.success("User updated successfully!");
            setIsModalOpen(false);
            await fetchUsers();
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error("Failed to update user.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async(id) => {
        if (!window.confirm("Are you sure you want to delete this user?")) 
            return;
        
        try {
            await api.delete(`/user/${id}`);
            toast.success("User deleted successfully!");
            await fetchUsers();
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error("Failed to delete user.");
        }
    };

    return (
        <div className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Users</h2>

            {isLoading
                ? (
                    <p>Loading users...</p>
                )
                : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow">
                            <thead>
                                <tr className="bg-gray-100 text-sm sm:text-base">
                                    <th className="px-4 py-2 border">ID</th>
                                    <th className="px-4 py-2 border">First Name</th>
                                    <th className="px-4 py-2 border">Last Name</th>
                                    <th className="px-4 py-2 border">Email</th>
                                    <th className="px-4 py-2 border">Role</th>
                                    <th className="px-4 py-2 border">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length > 0
                                    ? (users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 text-sm sm:text-base">
                                            <td className="px-4 py-2 border">{user.id}</td>
                                            <td className="px-4 py-2 border">{user.first_name}</td>
                                            <td className="px-4 py-2 border">{user.last_name}</td>
                                            <td className="px-4 py-2 border">{user.email}</td>
                                            <td className="px-4 py-2 border">{user.role}</td>
                                            <td className="px-4 py-2 border whitespace-nowrap">
                                                <button
                                                    onClick={() => handleEditClick(user)}
                                                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-xs sm:text-sm">
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="bg-red-500 text-white px-3 py-1 ml-2 rounded hover:bg-red-600 text-xs sm:text-sm">
                                                    Delete
                                                </button>

                                            </td>
                                        </tr>
                                    )))
                                    : (
                                        <tr>
                                            <td colSpan="6" className="text-center py-4">
                                                No users found.
                                            </td>
                                        </tr>
                                    )}
                            </tbody>
                        </table>
                    </div>
                )}

            {/* Edit Modal */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg z-50">
                        <h3 className="text-lg font-bold mb-4">Edit User</h3>

                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div>
                                <label className="block mb-2 text-sm font-medium">First Name</label>
                                <input
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleInputChange}
                                    className="w-full border rounded px-3 py-2"/>
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-medium">Last Name</label>
                                <input
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleInputChange}
                                    className="w-full border rounded px-3 py-2"/>
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-medium">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full border rounded px-3 py-2"/>
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-medium">Role</label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    className="w-full border rounded px-3 py-2">
                                    <option value="admin">Admin</option>
                                    <option value="staff">Staff</option>
                                    <option value="customer">Customer</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`px-4 py-2 text-white rounded ${loading
                                    ? 'bg-blue-300'
                                    : 'bg-blue-500 hover:bg-blue-600'}`}>
                                    {loading
                                        ? "Saving..."
                                        : "Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
