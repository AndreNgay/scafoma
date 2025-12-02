import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import routes from "./routes/index.js";
import healthRoutes from "./routes/healthRoutes.js";
import {
  startConnectionMonitoring,
  performHealthCheck,
  gracefulShutdown,
} from "./libs/healthCheck.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors("*"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api-v1", routes);
app.use("/api-v1/health", healthRoutes);

app.use("*", (req, res) => {
  res.status(404).json({
    status: "404",
    message: "Not Found",
  });
});

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);

  // Perform initial health check
  console.log("Performing initial database health check...");
  await performHealthCheck();

  // Start database connection monitoring
  const monitorInterval = startConnectionMonitoring(30000); // Check every 30 seconds

  // Graceful shutdown handling
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully...");
    clearInterval(monitorInterval);
    await gracefulShutdown();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("SIGINT received, shutting down gracefully...");
    clearInterval(monitorInterval);
    await gracefulShutdown();
    process.exit(0);
  });
});
