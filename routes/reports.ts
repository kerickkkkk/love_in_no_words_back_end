import reportsController from "../controller/reportsController";
import express from "express";
import { isOwnerAuth } from "../middleware/auth";
import { cache } from "../middleware/cache";

const router = express.Router();

// O-5-1 獲取營收資料
router.get(
  "/send/email/admin/revenue/report",
  isOwnerAuth,
  cache,
  reportsController.getRevenue
);

// O-5-2 獲取賣出數量資料
router.get(
  "/send/email/admin/sell-quantity/report",
  isOwnerAuth,
  cache,
  reportsController.getSellQuantity
);

// O-5-3 獲取訂單數量資料
router.get(
  "/send/email/admin/orders-quantity/report",
  isOwnerAuth,
  cache,
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
  cache,
  reportsController.getOrderInformation
);

// O-5-6 訂單資訊下載API
router.get(
  "/reports/admin/orders/download",
  isOwnerAuth,
  cache,
  reportsController.downloadReports
);

export default router;
