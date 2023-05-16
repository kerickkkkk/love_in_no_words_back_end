import couponsController from "../controller/couponsController";
import express from "express";
import { isAuth, isOwnerAuth } from "../middleware/auth";
const router = express.Router();

// 管理端
router.get("/", isAuth, couponsController.getCoupons);
router.get("/admin", isOwnerAuth, couponsController.getCoupons);
router.post("/admin", isOwnerAuth, couponsController.createCoupons);
router.patch("/admin/:couponNo", isOwnerAuth, couponsController.patchCoupons);
router.delete("/admin/:couponNo", isOwnerAuth, couponsController.softDeleteCoupons);

// 前台 - 

export default router;
