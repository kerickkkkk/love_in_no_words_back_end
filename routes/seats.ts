import seatsController from "../controller/seatsController";
import reservationController from "../controller/reservationController";
import express from "express";
import { isOwnerAuth, isAuth } from "../middleware/auth";
const router = express.Router();

router.get("/", isOwnerAuth, seatsController.getSeats);
router.post("/", isOwnerAuth, seatsController.createSeat);
router.patch("/:tableNo", isOwnerAuth, seatsController.patchSeat);
router.delete("/:tableNo", isOwnerAuth, seatsController.softDeleteSeat);
// 保留座位功能 改成直接寫入 seats 座位人數上限
// router.get("/table-code", isAuth, seatsController.getTableCode);
// router.post("/table-code", isAuth, seatsController.createTableCode);
// router.delete(
//   "/table-code/:seatsType",
//   isAuth,
//   seatsController.deleteTableCode
// );

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
