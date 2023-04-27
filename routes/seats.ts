import seatsController from "../controller/seatsController";
import express from "express";
import { isOwnerAuth } from "../middleware/auth";
const router = express.Router();

router.get("/", isOwnerAuth, seatsController.getSeats);
router.post("/", isOwnerAuth, seatsController.createSeat);
router.patch("/:tableNo", isOwnerAuth, seatsController.patchSeat);
router.delete("/:tableNo", isOwnerAuth, seatsController.softDeleteSeat);

router.get("/table-code", isOwnerAuth, seatsController.getTableCode);
router.post("/table-code", isOwnerAuth, seatsController.createTableCode);
router.delete("/table-code/:seatsType", isOwnerAuth, seatsController.deleteTableCode);

export default router;
