import couponsController from "../controller/couponsController";
import express from "express";
import { isAuth } from "../middleware/auth";
const router = express.Router();

// 管理端
router.get("/admin/coupons", isAuth, couponsController.getCoupons);
router.post("/admin/coupons", isAuth, couponsController.createCoupons);
router.patch("/admin/coupons/:couponNo", isAuth, couponsController.patchCoupons);
router.delete("/admin/coupons/:couponNo", isAuth, couponsController.softDeleteCoupons);

// 前台 - 

export default router;
