import express from "express";
import {
  getConcessions,
  getConcessionById,
  createConcession,
  updateConcession,
  deleteConcession
} from "../controllers/concessionController.js";

const router = express.Router();

// Get all concessions
router.get("/", getConcessions);

// Get a single concession by ID
router.get("/:id", getConcessionById);

// Create a new concession
router.post("/", createConcession);

// Update a concession
router.put("/:id", updateConcession);

// Delete a concession
router.delete("/:id", deleteConcession);

export default router;
