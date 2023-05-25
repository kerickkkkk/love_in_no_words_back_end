import onePlusOnesController from "../controller/onePlusOnesController";
import express from "express";
import { isOwnerAuth } from "../middleware/auth";
const router = express.Router();

router.get("/admin", isOwnerAuth, onePlusOnesController.getOnePlusOnes);
router.post("/admin", isOwnerAuth, onePlusOnesController.createOnePlusOnes);
router.delete("/admin/:couponNo", isOwnerAuth, onePlusOnesController.deleteOnePlusOnes);

export default router;
