import usersController from "../controller/usersController";
import express from "express";
import { isAuth, isOwnerAuth } from "../middleware/auth";
const router = express.Router();

/* GET users listing. */
router.get("/admin/users/", isOwnerAuth, usersController.getUsers);
router.post("/admin/users/", isOwnerAuth, usersController.creatUser);
router.patch("/admin/users/:id", isOwnerAuth, usersController.updateUser);
router.delete(
  "/admin/users/:id/:titleNo",
  isOwnerAuth,
  usersController.softDeleteUser
);
router.post("/users/sign_up", usersController.signUp);
router.post("/users/login", usersController.login);
router.post("/users/reset_password", isAuth, usersController.resetPassword);
router.get("/users/profile", isAuth, usersController.profile);
router.get("/users/:id", isAuth, usersController.getUser);

export default router;
