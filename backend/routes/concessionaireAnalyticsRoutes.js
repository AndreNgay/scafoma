import express from "express";
import { getConcessionaireAnalytics } from "../controllers/concessionaireAnalyticsController.js";

const router = express.Router();

router.get("/:id", getConcessionaireAnalytics);

export default router;
