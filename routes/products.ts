import productsController from "../controller/productsController";
import express from "express";
import { isAuth, isOwnerAuth } from "../middleware/auth";
import upload from "../service/image";
const router = express.Router();
// O-3-1 條件搜尋商品API
router.get("/admin", isOwnerAuth, productsController.getProducts);
// O-3-2 上傳商品圖片API
router.post(
  "/admin/uploadPhotos",
  isOwnerAuth,
  upload,
  productsController.uploadProductPhoto
);
// O-3-3 新增商品API
router.post("/admin", isOwnerAuth, productsController.createProduct);
// O-3-4 修改商品API
router.patch("/admin/:productNo", isOwnerAuth, productsController.patchProduct);
router.delete(
  "/admin/:productNo",
  isOwnerAuth,
  productsController.deleteProduct
);
// O-3-6 取得商品代碼分類API
router.get("/dessertcodes", isAuth, productsController.getProductType);
// O-3-7 新增商品分類API
router.post(
  "/admin/dessertcodes",
  isOwnerAuth,
  productsController.createProductType
);
// O-3-8 刪除商品分類API
router.delete(
  "/admin/dessertcodes/:productsType",
  isOwnerAuth,
  productsController.deleteProductType
);

export default router;
