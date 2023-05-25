import abCouponsController from "../controller/abCouponsController";
import express from "express";
import { isOwnerAuth } from "../middleware/auth";
const router = express.Router();

router.get("/admin", isOwnerAuth, abCouponsController.getAbCoupons);
router.post("/admin", isOwnerAuth, abCouponsController.createAbCoupons);
router.delete("/admin/:couponNo", isOwnerAuth, abCouponsController.deleteAbCoupons);

export default router;
