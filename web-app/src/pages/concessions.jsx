import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DataGrid } from "@mui/x-data-grid";
import { Button, MenuItem, TextField } from "@mui/material";
import { toast } from "sonner";
import api from "../libs/apiCall";

export const Concessions = () => {
  const { cafeteriaId } = useParams();

  const [concessions, setConcessions] = useState([]);
  const [filteredConcessions, setFilteredConcessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [editingConcession, setEditingConcession] = useState(null);
  const [formData, setFormData] = useState({
    concession_name: "",
    concessionaire_id: "",
    cafeteria_id: cafeteriaId,
  });
  const [createData, setCreateData] = useState({
    concession_name: "",
    concessionaire_id: "",
    cafeteria_id: cafeteriaId,
  });

  const [loading, setLoading] = useState(false);
  const [concessionaires, setConcessionaires] = useState([]);

  // Fetch concessions
  const fetchConcessions = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/concession");
      const concessionsList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.data)
        ? res.data.data
        : [];

      const filtered = concessionsList.filter(
        (c) => String(c.cafeteria_id) === String(cafeteriaId)
      );
      setConcessions(filtered);
      setFilteredConcessions(filtered);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch concessions");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch concessionaires
  const fetchConcessionaires = async () => {
    try {
      const res = await api.get(`/concessionaire`);
      const list = Array.isArray(res.data.concessionaires)
        ? res.data.concessionaires
        : [];
      setConcessionaires(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch concessionaires");
      setConcessionaires([]);
    }
  };

  useEffect(() => {
    fetchConcessions();
    fetchConcessionaires();
  }, [cafeteriaId]);

  // Search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredConcessions(concessions);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredConcessions(
        concessions.filter(
          (c) =>
            (c.concession_name &&
              c.concession_name.toLowerCase().includes(lower)) ||
            (c.concessionaire_name &&
              c.concessionaire_name.toLowerCase().includes(lower))
        )
      );
    }
  }, [searchTerm, concessions]);

  // Handlers
  const handleEditClick = (concession) => {
    setEditingConcession(concession);
    setFormData({
      concession_name: concession.concession_name,
      concessionaire_id: concession.concessionaire_id
        ? String(concession.concessionaire_id)
        : "",
      cafeteria_id: cafeteriaId,
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


  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingConcession) return;
    try {
      setLoading(true);
      await api.put(`/concession/${editingConcession.id}`, {
        ...formData,
        concessionaire_id: Number(formData.concessionaire_id) || null,
      });
      toast.success("Concession updated!");
      setIsModalOpen(false);
      await fetchConcessions();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update concession");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post(`/concession`, {
        ...createData,
        concessionaire_id: Number(createData.concessionaire_id) || null,
      });
      toast.success("Concession created!");
      setIsCreateModalOpen(false);
      setCreateData({
        concession_name: "",
        concessionaire_id: "",
        cafeteria_id: cafeteriaId,
      });
      await fetchConcessions();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create concession");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this concession?"))
      return;
    try {
      await api.delete(`/concession/${id}`);
      toast.success("Concession deleted!");
      await fetchConcessions();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete concession");
    }
  };

  const columns = [
    { field: "id", headerName: "ID", width: 80 },
    {
      field: "concession_name",
      headerName: "Concession Name",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "concessionaire_name",
      headerName: "Concessionaire",
      flex: 1,
      minWidth: 200,
    },
    { field: "created_at", headerName: "Created At", width: 150 },
    { field: "updated_at", headerName: "Updated At", width: 150 },
    {
      field: "actions",
      headerName: "Actions",
      width: 250,
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
            onClick={() => handleDelete(params.row.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  // Render select safely
  const renderConcessionaireSelect = (value, onChange) => {
    const safeValue =
      concessionaires.some((u) => String(u.id) === String(value)) || value === ""
        ? value
        : "";
    return (
      <TextField
        select
        name="concessionaire_id"
        value={safeValue}
        onChange={onChange}
        fullWidth
        required
      >
        <MenuItem value="">-- Select Concessionaire --</MenuItem>
        {concessionaires.map((u) => (
          <MenuItem key={u.id} value={String(u.id)}>
            {u.first_name} {u.last_name} ({u.email})
          </MenuItem>
        ))}
      </TextField>
    );
  };

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold mb-4">
        Concessions (Cafeteria #{cafeteriaId})
      </h2>

      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search concessions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-1/3 border rounded px-3 py-2"
        />

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="ml-4 px-4 py-2 bg-green-500 text-white rounded"
        >
          + Add Concession
        </button>
      </div>

      <div style={{ height: 500, width: "100%" }}>
        <DataGrid
          rows={filteredConcessions}
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
            <h3 className="text-lg font-bold mb-4">Edit Concession</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Concession Name
                </label>
                <input
                  type="text"
                  name="concession_name"
                  value={formData.concession_name}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Concessionaire
                </label>
{renderConcessionaireSelect(
  formData.concessionaire_id,
  (e) => handleInputChange(e, false)   // explicitly set false
)}

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
            <h3 className="text-lg font-bold mb-4">Add Concession</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Concession Name
                </label>
                <input
                  type="text"
                  name="concession_name"
                  value={createData.concession_name}
                  onChange={(e) => handleInputChange(e, true)}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Concessionaire
                </label>
{renderConcessionaireSelect(
  createData.concessionaire_id,
  (e) => handleInputChange(e, true)    // explicitly set true
)}


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
