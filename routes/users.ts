import usersController from "../controller/usersController";
import express from "express";
import { isAuth, isOwnerAuth } from "../middleware/auth";
const router = express.Router();

/* GET users listing. */
router.get("/", isOwnerAuth, usersController.getUsers);
router.post("/", isOwnerAuth, usersController.creatUser);
router.patch("/:id", isOwnerAuth, usersController.updateUser);
router.delete("/:id/:titleNo", isOwnerAuth, usersController.softDeleteUser);
router.post("/sign_up", usersController.signUp);
router.post("/login", usersController.login);
router.post("/reset_password", isAuth, usersController.resetPassword);
router.get("/profile", isAuth, usersController.profile);
router.get("/:id", isAuth, usersController.getUser);

export default router;
