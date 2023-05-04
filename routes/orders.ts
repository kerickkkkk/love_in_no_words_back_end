import express from "express";
import { isOwnerAuth } from "../middleware/auth";
import ordersController from "../controller/ordersController"

const router = express.Router();

router.post("/admin", isOwnerAuth, ordersController.handleOrder);
router.post("/admin/calculate/total-price", isOwnerAuth, ordersController.handleOrder)

export default router;
