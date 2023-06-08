import express from "express";
import linePayControllers from "../controller/linePayController"

const router = express.Router();
router.post("/:orderNo", linePayControllers.payment)
router.get("/confirm", linePayControllers.confirm)
router.get("/cancel", linePayControllers.cancel)
router.post("/check/:orderNo", linePayControllers.checkPayment)

export default router;
