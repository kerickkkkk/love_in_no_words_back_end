import express from "express";
import linePayControllers from "../controller/linePayController"
import { isAuth } from "../middleware/auth";

const router = express.Router();
router.post("/:orderNo", linePayControllers.payment)
router.get("/confirm", linePayControllers.confirm)
router.get("/cancel", linePayControllers.cancel)
router.get("/check/:orderNo", isAuth, linePayControllers.checkPayment)

export default router;
