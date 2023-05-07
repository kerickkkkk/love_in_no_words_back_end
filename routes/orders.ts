import express from "express";
import { isAuth } from "../middleware/auth";
import ordersController from "../controller/ordersController"

const router = express.Router();

router.post("/", isAuth, ordersController.handleOrder);
router.post("/calculate/total-price", isAuth, ordersController.handleOrder)

export default router;
