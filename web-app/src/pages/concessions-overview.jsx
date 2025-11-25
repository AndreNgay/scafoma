import React, { useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { toast } from "sonner";
import api from "../libs/apiCall";
import { Button, MenuItem, TextField } from "@mui/material";
import Modal from "react-modal";
Modal.setAppElement("#root");

export const ConcessionsOverview = () => {
  const [concessions, setConcessions] = useState([]);
  const [filteredConcessions, setFilteredConcessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCafeteriaId, setFilterCafeteriaId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [editingConcession, setEditingConcession] = useState(null);
  const [deletingConcession, setDeletingConcession] = useState(null);

  const [formData, setFormData] = useState({
    concession_name: "",
    concessionaire_id: "",
    cafeteria_id: "",
  });

  const [createData, setCreateData] = useState({
    concession_name: "",
    concessionaire_id: "",
    cafeteria_id: "",
  });

  const [loading, setLoading] = useState(false);
  const [concessionaires, setConcessionaires] = useState([]);
  const [cafeterias, setCafeterias] = useState([]);

  const fetchConcessions = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/concession/all");
      const list = Array.isArray(res.data.data) ? res.data.data : [];
      const formatted = list.map((item) => ({
        id: item.id,
        ...item,
      }));
      setConcessions(formatted);
      setFilteredConcessions(formatted);
    } catch (err) {
      console.error("Error fetching concessions:", err);
      toast.error(err.message || "Failed to fetch concessions");
      setConcessions([]);
      setFilteredConcessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConcessionaires = async () => {
    try {
      const res = await api.get("/concessionaire");
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

  const fetchCafeterias = async () => {
    try {
      const { data } = await api.get("/cafeteria/all");
      const list = Array.isArray(data.data) ? data.data : [];
      setCafeterias(list);
    } catch (err) {
      console.error("Error fetching cafeterias:", err);
      toast.error("Failed to fetch cafeterias");
      setCafeterias([]);
    }
  };

  useEffect(() => {
    fetchConcessions();
    fetchConcessionaires();
    fetchCafeterias();
  }, []);

  useEffect(() => {
    let base = concessions;

    if (filterCafeteriaId) {
      base = base.filter(
        (c) => String(c.cafeteria_id) === String(filterCafeteriaId)
      );
    }

    if (!searchTerm) {
      setFilteredConcessions(base);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredConcessions(
        base.filter((c) =>
          (c.concession_name &&
            c.concession_name.toLowerCase().includes(lower)) ||
          (c.concessionaire_name &&
            c.concessionaire_name.toLowerCase().includes(lower)) ||
          (c.cafeteria_name &&
            c.cafeteria_name.toLowerCase().includes(lower)) ||
          (c.cafeteria_id && String(c.cafeteria_id).includes(lower))
        )
      );
    }
  }, [searchTerm, concessions, filterCafeteriaId]);

  const handleEditClick = (concession) => {
    setEditingConcession(concession);
    setFormData({
      concession_name: concession.concession_name || "",
      concessionaire_id: concession.concessionaire_id
        ? String(concession.concessionaire_id)
        : "",
      cafeteria_id: concession.cafeteria_id
        ? String(concession.cafeteria_id)
        : "",
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (concession) => {
    setDeletingConcession(concession);
    setIsDeleteModalOpen(true);
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
        cafeteria_id: Number(formData.cafeteria_id) || null,
      });
      toast.success("Concession updated!");
      setIsEditModalOpen(false);
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
      await api.post("/concession", {
        ...createData,
        concessionaire_id: Number(createData.concessionaire_id) || null,
        cafeteria_id: Number(createData.cafeteria_id) || null,
      });
      toast.success("Concession created!");
      setIsCreateModalOpen(false);
      setCreateData({
        concession_name: "",
        concessionaire_id: "",
        cafeteria_id: "",
      });
      await fetchConcessions();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create concession");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingConcession) return;
    try {
      await api.delete(`/concession/${deletingConcession.id}`);
      toast.success("Concession deleted!");
      setIsDeleteModalOpen(false);
      await fetchConcessions();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete concession");
    }
  };

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
            {u.first_name} {u.last_name}
          </MenuItem>
        ))}
      </TextField>
    );
  };

  const renderCafeteriaSelect = (value, onChange) => {
    const safeValue =
      cafeterias.some((c) => String(c.id) === String(value)) || value === ""
        ? value
        : "";
    return (
      <TextField
        select
        name="cafeteria_id"
        value={safeValue}
        onChange={onChange}
        fullWidth
        required
      >
        <MenuItem value="">-- Select Cafeteria --</MenuItem>
        {cafeterias.map((c) => (
          <MenuItem key={c.id} value={String(c.id)}>
            {c.cafeteria_name}
          </MenuItem>
        ))}
      </TextField>
    );
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
    {
      field: "cafeteria_name",
      headerName: "Cafeteria",
      flex: 1,
      minWidth: 200,
    },
    { field: "cafeteria_id", headerName: "Cafeteria ID", width: 130 },
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
            onClick={() => handleDeleteClick(params.row)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold mb-4">Concessions Overview</h2>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <input
          type="text"
          placeholder="Search concessions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-1/3 border rounded px-3 py-2"
        />

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={filterCafeteriaId}
            onChange={(e) => setFilterCafeteriaId(e.target.value)}
            className="px-3 py-2 border rounded bg-white text-sm min-w-[180px]"
          >
            <option value="">All cafeterias</option>
            {cafeterias.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.cafeteria_name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            + Add Concession
          </button>
        </div>
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

      <Modal
        isOpen={isEditModalOpen}
        onRequestClose={() => setIsEditModalOpen(false)}
        contentLabel="Edit Concession"
        className="bg-white rounded-lg p-6 w-full max-w-md mx-auto mt-20 shadow-lg outline-none"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50"
      >
        <h3 className="text-lg font-bold mb-4">Edit Concession</h3>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium">Concession Name</label>
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
            <label className="block mb-2 text-sm font-medium">Concessionaire</label>
            {renderConcessionaireSelect(formData.concessionaire_id, (e) =>
              handleInputChange(e, false)
            )}
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">Cafeteria</label>
            {renderCafeteriaSelect(formData.cafeteria_id, (e) =>
              handleInputChange(e, false)
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
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
      </Modal>

      <Modal
        isOpen={isCreateModalOpen}
        onRequestClose={() => setIsCreateModalOpen(false)}
        contentLabel="Create Concession"
        className="bg-white rounded-lg p-6 w-full max-w-md mx-auto mt-20 shadow-lg outline-none"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50"
      >
        <h3 className="text-lg font-bold mb-4">Add Concession</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium">Concession Name</label>
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
            <label className="block mb-2 text-sm font-medium">Concessionaire</label>
            {renderConcessionaireSelect(createData.concessionaire_id, (e) =>
              handleInputChange(e, true)
            )}
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">Cafeteria</label>
            {renderCafeteriaSelect(createData.cafeteria_id, (e) =>
              handleInputChange(e, true)
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
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onRequestClose={() => setIsDeleteModalOpen(false)}
        contentLabel="Delete Concession"
        className="bg-white rounded-lg p-6 w-full max-w-md mx-auto mt-20 shadow-lg outline-none"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50"
      >
        <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
        <p>
          Are you sure you want to delete{" "}
          <strong>{deletingConcession?.concession_name}</strong>?
        </p>
        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(false)}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
};
