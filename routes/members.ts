import membersController from "../controller/membersController";
import express from "express";
import { isAuth } from "../middleware/auth";
const router = express.Router();

//members
router.post("/", isAuth, membersController.signUpMember);
router.get("/", isAuth, membersController.searchMember);
router.delete("/:id", isAuth, membersController.softDeleteMember);
router.patch("/:id", isAuth, membersController.updateMember);

export default router;
