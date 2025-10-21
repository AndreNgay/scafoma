import express from "express";
import { getVariationsByGroupId, addVariation, updateVariation, deleteVariation, uploadVariationImage } from "../controllers/itemVariationController.js";
import { upload } from "./concessionRoutes.js";

const router = express.Router();

router.get("/group/:id", getVariationsByGroupId);
router.post("/", addVariation);
router.put("/:id", updateVariation);
router.delete("/:id", deleteVariation);
router.put("/:id/image", upload.single("image"), uploadVariationImage);

export default router;