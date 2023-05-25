import express from "express";
import { isAuth } from "../middleware/auth";
import ordersController from "../controller/ordersController"

const router = express.Router();

router.post("/", isAuth, ordersController.handleOrder);
router.post("/calculate/total-price", isAuth, ordersController.handleOrder);
router.get("/", isAuth, ordersController.getOrders);
router.get("/detail/:orderId", isAuth, ordersController.getOrderDetail);
router.post("/rating/:orderId", isAuth, ordersController.postRating);
export default router;
