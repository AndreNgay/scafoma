import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import api from "../libs/apiCall"; // Axios instance

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCafeterias: 0,
    totalConcessions: 0,
    totalMenuItems: 0,
    ordersByStatus: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get("/dashboard"); // Axios returns data here
        setStats(data);
        console.log(data);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#a4de6c"];

  if (loading) return <p style={{ padding: "20px" }}>Loading dashboard...</p>;

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Dashboard</h1>

      {/* Top Cards */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
        <StatCard title="Total Users" value={stats.totalUsers} />
        <StatCard title="Total Cafeterias" value={stats.totalCafeterias} />
        <StatCard title="Total Concessions" value={stats.totalConcessions} />
        <StatCard title="Total Menu Items" value={stats.totalMenuItems} />
      </div>

      {/* Charts */}
      <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "300px" }}>
          <h3>Orders by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.ordersByStatus}>
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ flex: 1, minWidth: "300px" }}>
          <h3>Orders Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.ordersByStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {stats.ordersByStatus.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value }) => (
  <div
    style={{
      flex: 1,
      background: "#f0f0f0",
      padding: "20px",
      borderRadius: "8px",
      textAlign: "center"
    }}
  >
    <h3>{title}</h3>
    <p style={{ fontSize: "24px", fontWeight: "bold" }}>{value}</p>
  </div>
);

export default Dashboard;
