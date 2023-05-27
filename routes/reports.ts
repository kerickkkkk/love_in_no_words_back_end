import reportsController from "../controller/reportsController";
import express from "express";
import { isOwnerAuth } from "../middleware/auth";

const router = express.Router();

// O-5-1 獲取營收資料
router.get(
  "/send/email/admin/revenue/report",
  isOwnerAuth,
  reportsController.getRevenue
);

// O-5-2 獲取賣出數量資料
router.get(
  "/send/email/admin/sell-quantity/report",
  isOwnerAuth,
  reportsController.getSellQuantity
);

// O-5-3 獲取訂單數量資料
router.get(
  "/send/email/admin/orders-quantity/report",
  isOwnerAuth,
  reportsController.getOrderQuantity
);

// O-5-4 報表寄送
router.get(
  "/send/email/admin/report/:reportType",
  isOwnerAuth,
  reportsController.sendReport
);

// O-5-5 條件搜尋訂單資訊
router.get(
  "/reports/admin/orders",
  isOwnerAuth,
  reportsController.getOrderInformation
);

// O-5-6 訂單資訊下載API 之後要加店長權限
router.get(
  "/reports/admin/orders/download",

  reportsController.downloadReports
);

export default router;
