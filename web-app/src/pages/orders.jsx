import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { DataGrid } from "@mui/x-data-grid";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

export const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Dummy order data with customer names and concession names
  const dummyOrders = [
    {
      id: 1,
      customer_id: 2,
      customer_name: "John Doe", // Dummy customer name
      concession_id: 1,
      concession_name: "Burger Shack", // Dummy concession name
      total_price: 100.0,
      order_status: 'pending',
      payment_method: 'on-counter',
      created_at: '2023-09-20 10:00:00',
      updated_at: '2023-09-20 10:05:00',
    },
    {
      id: 2,
      customer_id: 3,
      customer_name: "Jane Smith", // Dummy customer name
      concession_id: 2,
      concession_name: "Pizza Corner", // Dummy concession name
      total_price: 150.0,
      order_status: 'completed',
      payment_method: 'gcash',
      created_at: '2023-09-21 12:00:00',
      updated_at: '2023-09-21 12:10:00',
    },
    {
      id: 3,
      customer_id: 1,
      customer_name: "Alice Johnson", // Dummy customer name
      concession_id: 1,
      concession_name: "Burger Shack", // Dummy concession name
      total_price: 75.0,
      order_status: 'accepted',
      payment_method: 'on-counter',
      created_at: '2023-09-22 08:00:00',
      updated_at: '2023-09-22 08:15:00',
    },
  ];

  useEffect(() => {
    setOrders(dummyOrders);
    setFilteredOrders(dummyOrders);
    setIsLoading(false);
  }, []);

  // Search functionality
  useEffect(() => {
    if (!searchTerm) {
      setFilteredOrders(orders);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredOrders(
        orders.filter(
          (order) =>
            order.customer_name.toLowerCase().includes(lower) ||
            order.concession_name.toLowerCase().includes(lower) ||
            order.total_price.toString().includes(lower) ||
            order.created_at.toLowerCase().includes(lower) ||
            order.updated_at.toLowerCase().includes(lower)
        )
      );
    }
  }, [searchTerm, orders]);

  const handleDeleteOrder = async (id) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      // Here we would call the API to delete the order.
      // await api.delete(`/order/${id}`);
      toast.success("Order deleted successfully!");
      setOrders(orders.filter((order) => order.id !== id)); // Filter out the deleted order
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Failed to delete order.");
    }
  };

  // Columns for the DataGrid
  const columns = [
    { field: "id", headerName: "ID", width: 80 },
    { field: "customer_name", headerName: "Customer Name", width: 180 },
    { field: "concession_name", headerName: "Concession Name", width: 180 },
    { field: "total_price", headerName: "Total Price", width: 150 },
    { field: "order_status", headerName: "Status", width: 150 },
    { field: "payment_method", headerName: "Payment Method", width: 180 },
    { field: "created_at", headerName: "Created At", width: 180 },
    { field: "updated_at", headerName: "Updated At", width: 180 },
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
            onClick={() => navigate(`/order/${params.row.id}`)} // Navigate to order details page
          >
            View
          </Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={() => handleDeleteOrder(params.row.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold mb-4">Orders</h2>

      {/* Top bar */}
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search orders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-1/3 border rounded px-3 py-2"
        />
      </div>

      {/* DataGrid */}
      <div style={{ height: 500, width: "100%" }}>
        <DataGrid
          rows={filteredOrders}
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
                No orders found.
              </div>
            ),
          }}
        />
      </div>
    </div>
  );
};
