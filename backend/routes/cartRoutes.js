import express from "express";
import { getCartByCustomerId, addCart } from "../controllers/cartController.js";


const router = express.Router();

router.get("/customer/:id", getCartByCustomerId);
router.post("/", addCart)

export default router;