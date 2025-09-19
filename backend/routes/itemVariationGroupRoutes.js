import express from "express";
import { getVariationGroupsById, addVariationGroup, updateVariationGroup, deleteVariationGroup } from "../controllers/itemVariationGroupController.js";


const router = express.Router();

router.get("/:id", getVariationGroupsById);
router.post("/", addVariationGroup);
router.put("/:id", updateVariationGroup);
router.delete("/:id", deleteVariationGroup);

export default router;