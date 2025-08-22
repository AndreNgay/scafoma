import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "../libs/apiCall.js";
import {
  DataGrid,
} from "@mui/x-data-grid";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

export const Cafeterias = () => {
  const [cafeterias, setCafeterias] = useState([]);
  const [filteredCafeterias, setFilteredCafeterias] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [editingCafeteria, setEditingCafeteria] = useState(null);
  const [formData, setFormData] = useState({
    cafeteria_name: "",
    location: "",
  });
  const [createData, setCreateData] = useState({
    cafeteria_name: "",
    location: "",
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

const fetchCafeterias = async () => {
  try {
    const { data } = await api.get("/cafeteria/all");
    const formatted = (data.data || []).map((c) => ({
      id: c.id,
      ...c,
    }));
    setCafeterias(formatted);
    setFilteredCafeterias(formatted);
  } catch (error) {
    console.error("Error fetching cafeterias:", error);
    toast.error("Failed to fetch cafeterias. Please try again later.");
  } finally {
    setIsLoading(false);
  }
};


  useEffect(() => {
    fetchCafeterias();
  }, []);

  // search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredCafeterias(cafeterias);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredCafeterias(
        cafeterias.filter(
          (c) =>
            (c.cafeteria_name &&
              c.cafeteria_name.toLowerCase().includes(lower)) ||
            (c.location && c.location.toLowerCase().includes(lower))
        )
      );
    }
  }, [searchTerm, cafeterias]);

  const handleEditClick = (cafeteria) => {
    setEditingCafeteria(cafeteria);
    setFormData({
      cafeteria_name: cafeteria.cafeteria_name,
      location: cafeteria.location,
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e, isCreate = false) => {
    const { name, value } = e.target;
    if (isCreate) {
      setCreateData((prev) => ({ ...prev, [name]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleUpdateCafeteria = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.put(`/cafeteria/${editingCafeteria.id}`, formData);
      toast.success("Cafeteria updated successfully!");
      setIsModalOpen(false);
      await fetchCafeterias();
    } catch (error) {
      console.error("Error updating cafeteria:", error);
      toast.error("Failed to update cafeteria.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCafeteria = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data } = await api.post("/cafeteria", createData);
      toast.success(`Cafeteria created: ${data.cafeteria?.cafeteria_name}`);
      setIsCreateModalOpen(false);
      setCreateData({ cafeteria_name: "", location: "" });
      await fetchCafeterias();
    } catch (error) {
      console.error("Error creating cafeteria:", error);
      toast.error("Failed to create cafeteria.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCafeteria = async (id) => {
    if (!window.confirm("Are you sure you want to delete this cafeteria?")) return;
    try {
      await api.delete(`/cafeteria/${id}`);
      toast.success("Cafeteria deleted successfully!");
      await fetchCafeterias();
    } catch (error) {
      console.error("Error deleting cafeteria:", error);
      toast.error("Failed to delete cafeteria.");
    }
  };

  // columns
  const columns = [
    { field: "id", headerName: "ID", width: 80 },
    { field: "cafeteria_name", headerName: "Cafeteria Name", flex: 1, minWidth: 200 },
    { field: "location", headerName: "Location", flex: 1, minWidth: 200 },
    { field: "created_at", headerName: "Created At", width: 150 },
    { field: "updated_at", headerName: "Updated At", width: 150 },
    {
      field: "actions",
      headerName: "Actions",
      width: 350,
      sortable: false,
      renderCell: (params) => (
        <div style={{ display: "flex", gap: "8px" }}>
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
            color="error"
            onClick={() => handleDeleteCafeteria(params.row.id)}
          >
            Delete
          </Button>
          <Button
            size="small"
            variant="contained"
            color="secondary"
            onClick={() => navigate(`/concessions/${params.row.id}`)}
          >
            Manage
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold mb-4">Cafeterias</h2>

      {/* Top bar */}
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search cafeterias..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-1/3 border rounded px-3 py-2"
        />

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="ml-4 px-4 py-2 bg-green-500 text-white rounded"
        >
          + Add Cafeteria
        </button>
      </div>

      {/* DataGrid */}
      <div style={{ height: 500, width: "100%" }}>
        <DataGrid
          rows={filteredCafeterias}
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
            <h3 className="text-lg font-bold mb-4">Edit Cafeteria</h3>
            <form onSubmit={handleUpdateCafeteria} className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Cafeteria Name</label>
                <input
                  type="text"
                  name="cafeteria_name"
                  value={formData.cafeteria_name}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
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

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg z-50">
            <h3 className="text-lg font-bold mb-4">Add Cafeteria</h3>
            <form onSubmit={handleCreateCafeteria} className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Cafeteria Name</label>
                <input
                  type="text"
                  name="cafeteria_name"
                  value={createData.cafeteria_name}
                  onChange={(e) => handleInputChange(e, true)}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Location</label>
                <input
                  type="text"
                  name="location"
                  value={createData.location}
                  onChange={(e) => handleInputChange(e, true)}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 text-white rounded ${
                    loading ? "bg-green-300" : "bg-green-500 hover:bg-green-600"
                  }`}
                >
                  {loading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
