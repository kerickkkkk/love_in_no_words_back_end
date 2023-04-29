import seatsController from "../controller/seatsController";
import reservationController from "../controller/reservationController";
import express from "express";
import { isOwnerAuth, isAuth } from "../middleware/auth";
const router = express.Router();

router.get("/", isOwnerAuth, seatsController.getSeats);
router.post("/", isOwnerAuth, seatsController.createSeat);
router.patch("/:tableNo", isOwnerAuth, seatsController.patchSeat);
router.delete("/:tableNo", isOwnerAuth, seatsController.softDeleteSeat);

router.post("/reservation", isAuth, reservationController.createReservation);
export default router;
