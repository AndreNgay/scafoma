// concessionRoutes.js
import express from "express";
import {
  getConcessions,
  getConcessionById,
  createConcession,
  updateConcession,
  deleteConcession,
  updateMyConcession,
} from "../controllers/concessionController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.get("/all", getConcessions);
router.get("/:id", getConcessionById);

// Protected
router.get("/", authMiddleware, getConcessionById);
router.put("/me", authMiddleware, updateMyConcession);

// Create/Delete
router.post("/", createConcession);
router.put("/:id", updateConcession);
router.delete("/:id", deleteConcession);

export default router;
