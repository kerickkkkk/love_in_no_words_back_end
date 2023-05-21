import { Request, Response } from "express";
import express from "express";
const router = express.Router();
/* GET home page. */
router.get("/", (req: Request, res: Response): void => {
  // res.render("index", { title: "歡迎來到傲嬌甜點店" });
  res.json({ title: "歡迎來到傲嬌甜點店" });
});

router.get("/socket", (req: Request, res: Response): void => {
  const io = req.app.settings.io;
  console.log("準備廣播囉");
  io.emit("employee", "從 route 打 出去employee");
  res.end();
});

export default router;
