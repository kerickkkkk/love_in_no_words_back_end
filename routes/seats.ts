import seatsController from "../controller/seatsController";
import reservationController from "../controller/reservationController";
import express from "express";
import { isOwnerAuth } from "../middleware/auth";
const router = express.Router();

router.get("/admin", isOwnerAuth, seatsController.getSeats);
router.post("/admin", isOwnerAuth, seatsController.createSeat);
router.patch("/admin/:tableNo", isOwnerAuth, seatsController.patchSeat);
router.delete("/admin/:tableNo", isOwnerAuth, seatsController.softDeleteSeat);
// 保留座位功能 改成直接寫入 seats 座位人數上限
// router.get("/admin/table-code", isAuth, seatsController.getTableCode);
// router.post("/admin/table-code", isAuth, seatsController.createTableCode);
// router.delete(
//   "/admin/table-code/:seatsType",
//   isAuth,
//   seatsController.deleteTableCode
// );

router.get("/table-code", isOwnerAuth, seatsController.getTableCode);
router.post("/table-code", isOwnerAuth, seatsController.createTableCode);
router.delete("/table-code/:seatsType", isOwnerAuth, seatsController.deleteTableCode);

router.post("/reservation", isAuth, reservationController.createReservation);
router.post("/no-reservation", isAuth, reservationController.setSeats);
router.get("/reservation", isAuth, reservationController.searchSeats);
router.patch(
  "/reservation/:reservationId",
  isAuth,
  reservationController.reviseReservation
);
router.delete(
  "/reservation/:reservationId",
  isAuth,
  reservationController.softDeleteReservation
);
export default router;
