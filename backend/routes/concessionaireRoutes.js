import express from "express";
import { getAllConcessionaire } from "../controllers/concessionaireController.js";


const router = express.Router();

router.get("/", getAllConcessionaire)


export default router;