import seatsController from "../controller/seatsController";
import express from "express";
import { isAuth } from "../middleware/auth";
const router = express.Router();

router.get("/", isAuth, seatsController.getSeats);
router.post("/", isAuth, seatsController.createSeat);
router.patch("/:tableNo", isAuth, seatsController.patchSeat);
router.delete("/:tableNo", isAuth, seatsController.softDeleteSeat);

router.get("/table-code", isAuth, seatsController.getTableCode);
router.post("/table-code", isAuth, seatsController.createTableCode);
router.delete("/table-code/:seatsType", isAuth, seatsController.deleteTableCode);

export default router;
