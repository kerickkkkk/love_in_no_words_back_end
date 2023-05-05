import productsController from "../controller/productsController";
import express from "express";
import { isOwnerAuth } from "../middleware/auth";
import upload from "../service/image";
const router = express.Router();

router.get("/admin", isOwnerAuth, productsController.getProducts);
router.post(
  "/admin/uploadPhotos",
  isOwnerAuth,
  upload,
  productsController.uploadProductPhoto
);
router.post("/admin", isOwnerAuth, productsController.createProduct);
router.patch("/admin/:productNo", isOwnerAuth, productsController.patchProduct);
router.delete(
  "/admin/:productNo",
  isOwnerAuth,
  productsController.deleteProduct
);

router.get(
  "/admin/product-type",
  isOwnerAuth,
  productsController.getProductType
);
router.post(
  "/admin/product-type",
  isOwnerAuth,
  productsController.createProductType
);
router.delete(
  "/admin/product-type/:productsType",
  isOwnerAuth,
  productsController.deleteProductType
);

export default router;
