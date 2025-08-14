import express from "express";
import { getCafeterias, getCafeteriaById, createCafeteria, updateCafeteria, deleteCafeteria } from "../controllers/cafeteriaController.js";

const router = express.Router();

// Get all cafeterias
router.get("/", getCafeterias);

// Get a single cafeteria by ID
router.get("/:id", getCafeteriaById);

// Create a new cafeteria
router.post("/", createCafeteria);

// Update a cafeteria
router.put("/:id", updateCafeteria);

// Delete a cafeteria
router.delete("/:id", deleteCafeteria);


export default router;