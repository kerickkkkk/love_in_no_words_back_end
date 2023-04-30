import productsController from "../controller/productsController"
import express from "express";
import { isAuth } from "../middleware/auth";
const router = express.Router();

router.get("/", isAuth, productsController.getProducts);
router.post("/", isAuth, productsController.createProduct);
router.patch("/:productNo", isAuth, productsController.patchProduct);
router.delete("/:productNo", isAuth, productsController.deleteProduct);

router.get("/product-type", isAuth, productsController.getProductType);
router.post("/product-type", isAuth, productsController.createProductType);
router.delete("/product-type/:productsType", isAuth, productsController.deleteProductType);

export default router;
