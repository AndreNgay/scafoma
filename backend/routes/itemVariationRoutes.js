import express from "express";
import { getItemVariationsById } from "../controllers/itemVariationController.js";


const router = express.Router();

router.get("/:id", getItemVariationsById);

export default router;