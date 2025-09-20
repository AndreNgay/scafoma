import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "../libs/apiCall.js";
import { DataGrid } from "@mui/x-data-grid";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

export const MenuItems = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchMenuItems = async () => {
    try {
      const { data } = await api.get(`/menu-item/admin`);
      const formatted = (data.data || []).map((item) => ({
        id: item.id,
        ...item,
      }));
      setMenuItems(formatted);
      setFilteredItems(formatted);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      toast.error("Failed to fetch menu items. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  // search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredItems(menuItems);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredItems(
        menuItems.filter(
          (i) =>
            (i.item_name && i.item_name.toLowerCase().includes(lower)) ||
            (i.created_at && i.created_at.toLowerCase().includes(lower))
        )
      );
    }
  }, [searchTerm, menuItems]);

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this menu item?")) return;
    try {
      await api.delete(`/menuitem/${id}`);
      toast.success("Menu item deleted successfully!");
      await fetchMenuItems();
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast.error("Failed to delete menu item.");
    }
  };

  // columns
  const columns = [
    { field: "id", headerName: "ID", width: 80 },
    { field: "item_name", headerName: "Item Name", flex: 1, minWidth: 200 },
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
            onClick={() => navigate(`/menuitem/${params.row.id}`)} // Navigate to details page
          >
            View
          </Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={() => handleDeleteItem(params.row.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold mb-4">Menu Items</h2>

      {/* Top bar */}
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search menu items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-1/3 border rounded px-3 py-2"
        />
      </div>

      {/* DataGrid */}
      <div style={{ height: 500, width: "100%" }}>
        <DataGrid
          rows={filteredItems}
          columns={columns}
          loading={isLoading}
          pageSizeOptions={[5, 10, 20]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
          }}
          disableRowSelectionOnClick
          slots={{
            noRowsOverlay: () => (
              <div style={{ padding: 20, textAlign: "center" }}>
                No menu items found.
              </div>
            ),
          }}
        />
      </div>
    </div>
  );
};
