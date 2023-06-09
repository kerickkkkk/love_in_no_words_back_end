import express from "express";
import { isAuth } from "../middleware/auth";
import ordersController from "../controller/ordersController"
import chefController from "../controller/chefController";
import { isCookAuth } from "../middleware/auth";

const router = express.Router();

router.post("/", isAuth, ordersController.handleOrder);
router.post("/calculate/total-price", isAuth, ordersController.handleOrder);
router.get("/", isAuth, ordersController.getOrders);
router.get("/detail/:orderId", isAuth, ordersController.getOrderDetail);
router.post("/rating/:orderId", isAuth, ordersController.postRating);
router.get("/check/cash/:orderNo", isAuth, ordersController.checkCash);
//chef
router.get("/pick-up", isCookAuth, chefController.getPickUpOrders);
router.patch("/pick-up/:orderNo", isCookAuth, chefController.updateOrderStatus);
export default router;
