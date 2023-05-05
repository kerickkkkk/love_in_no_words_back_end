import express from "express";
import { isAuth } from "../middleware/auth";
import ordersController from "../controller/ordersController"
import productsController from "../controller/productsController"

const router = express.Router();

router.get("/", isAuth, productsController.getProducts);
router.post("/", isAuth, ordersController.handleOrder);
router.post("/calculate/total-price", isAuth, ordersController.handleOrder)

export default router;
