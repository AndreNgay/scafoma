import express from "express";
import { getCartDetailsByCustomerId, addCartDetail, deleteCartDetail } from "../controllers/cartDetailController.js";


const router = express.Router();

router.get("/customer/:id", getCartDetailsByCustomerId);
router.post("/", addCartDetail)
router.delete("/:id", deleteCartDetail)

export default router;