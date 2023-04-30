import seatsController from "../controller/seatsController";
import reservationController from "../controller/reservationController";
import express from "express";
import { isOwnerAuth, isAuth } from "../middleware/auth";
const router = express.Router();

router.get("/", isOwnerAuth, seatsController.getSeats);
router.post("/", isOwnerAuth, seatsController.createSeat);
router.patch("/:tableNo", isOwnerAuth, seatsController.patchSeat);
router.delete("/:tableNo", isOwnerAuth, seatsController.softDeleteSeat);
router.get("/table-code", isAuth, seatsController.getTableCode);
router.post("/table-code", isAuth, seatsController.createTableCode);
router.delete(
  "/table-code/:seatsType",
  isAuth,
  seatsController.deleteTableCode
);

router.post("/reservation", isAuth, reservationController.createReservation);
export default router;
