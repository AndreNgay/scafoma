import express from "express";
import { getGroupsByMenuItemId, addVariationGroup, updateVariationGroup, deleteVariationGroup } from "../controllers/itemVariationGroupController.js";


const router = express.Router();

router.get("/menu-item/:id", getGroupsByMenuItemId);
router.post("/", addVariationGroup);
router.put("/:id", updateVariationGroup);
router.delete("/:id", deleteVariationGroup);

export default router;