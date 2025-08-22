import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "../libs/apiCall.js";
import { z } from "zod";
import {
  DataGrid,
  GridToolbar
} from "@mui/x-data-grid";
import { Button } from "@mui/material";


// Zod schema for validation
const UserSchema = z.object({
  first_name: z.string().min(1, { message: "First name is required" }),
  last_name: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  role: z.enum(["admin", "staff", "customer"], { message: "Role is required" }),
});

export const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "",
  });
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/user/all");
      const formattedUsers = (data.users || []).map((u) => ({
        id: u.id || u.user_id,
        ...u,
      }));
      setUsers(formattedUsers);
      setFilteredUsers(formattedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // custom search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            (u.first_name && u.first_name.toLowerCase().includes(lower)) ||
            (u.last_name && u.last_name.toLowerCase().includes(lower)) ||
            (u.email && u.email.toLowerCase().includes(lower)) ||
            (u.role && u.role.toLowerCase().includes(lower))
        )
      );
    }
  }, [searchTerm, users]);

  const handleEditClick = (user) => {
    setEditingUser(user);
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResetPassword = async (id) => {
    if (!window.confirm("Reset this user's password?")) return;
    try {
      const { data } = await api.post(`/user/${id}/reset-password`);
      toast.success(`Password reset! New password: ${data.newPassword}`);
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Failed to reset password.");
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    const result = UserSchema.safeParse(formData);
    if (!result.success) {
      const errorMessages = result.error.errors.map((err) => err.message).join("\n");
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

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`/user/${id}`);
      toast.success("User deleted successfully!");
      await fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user.");
    }
  };

  // DataGrid columns
  const columns = [
    { field: "id", headerName: "ID", width: 80 },
    { field: "first_name", headerName: "First Name", width: 150 },
    { field: "last_name", headerName: "Last Name", width: 150 },
    { field: "email", headerName: "Email", minWidth: 220, flex: 1 },
    { field: "role", headerName: "Role", width: 120 },
    { field: "created_at", headerName: "Created At", width: 120 },
    { field: "updated_at", headerName: "Updated At", width: 120 },
    {
      field: "actions",
      headerName: "Actions",
      width: 300,
      sortable: false,
      flexShrink: 0,
      align: "center", 
      headerAlign: "center", 
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "center",
            alignItems: "center", 
            width: "100%",
            height: "100%",
          }}
        >
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => handleEditClick(params.row)}
          >
            Edit
          </Button>
          <Button
            size="small"
            variant="contained"
            color="warning"
            onClick={() => handleResetPassword(params.row.id)}
          >
            Reset
          </Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={() => handleDeleteUser(params.row.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold mb-4">Users</h2>

      {/* Top bar: Search left, Add button right */}
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-1/3 border rounded px-3 py-2"
        />

        <button
          onClick={async () => {
            const email = prompt("Enter concessionaire email:");
            if (!email) return;
            try {
              const { data } = await api.post("/user/concessionaire", { email });
              toast.success(`Created! New password: ${data.password}`);
              await fetchUsers();
            } catch (error) {
              toast.error("Failed to create concessionaire.");
            }
          }}
          className="ml-4 px-4 py-2 bg-green-500 text-white rounded"
        >
          + Add Concessionaire
        </button>
      </div>

      {/* DataGrid with scroll support */}
      <div style={{ height: 500, width: "100%", overflowX: "auto" }}>
        <DataGrid
          rows={filteredUsers}
          columns={columns}
          loading={isLoading}
          pageSizeOptions={[5, 10, 20]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
          }}
          disableRowSelectionOnClick
        />
      </div>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
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
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Role</label>
                <input
                  type="text"
                  value={formData.role}
                  disabled
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 text-white rounded ${
                    loading ? "bg-blue-300" : "bg-blue-500 hover:bg-blue-600"
                  }`}
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
