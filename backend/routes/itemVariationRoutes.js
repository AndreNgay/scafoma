import express from "express";
import { getVariationsByGroupId, addVariation, updateVariation, deleteVariation } from "../controllers/itemVariationController.js";


const router = express.Router();

router.get("/group/:id", getVariationsByGroupId);
router.post("/", addVariation);
router.put("/:id", updateVariation);
router.delete("/:id", deleteVariation);

export default router;