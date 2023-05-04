import usersController from "../controller/usersController";
import express from "express";
import { isAuth, isOwnerAuth } from "../middleware/auth";
const router = express.Router();

/* 後台使用者管理API */
router.get("/admin/", isOwnerAuth, usersController.getUsers);
router.post("/admin/", isOwnerAuth, usersController.creatUser);
router.patch("/admin/:id", isOwnerAuth, usersController.updateUser);
router.delete(
  "/admin/:id/:titleNo",
  isOwnerAuth,
  usersController.softDeleteUser
);
/* POS系統初期建立用API */
router.post("/sign_up", usersController.signUp);
router.post("/login", usersController.login);
router.post("/reset_password", isAuth, usersController.resetPassword);
router.get("/profile", isAuth, usersController.profile);
router.get("/:id", isAuth, usersController.getUser);

export default router;
