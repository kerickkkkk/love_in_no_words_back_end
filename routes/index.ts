import { Request, Response } from "express";
import express from "express";
import { cache } from "../middleware/cache"
import { setCache } from "../connection/service/redis";

const router = express.Router();
/* GET home page. */
router.get("/", cache, (req: Request, res: Response): void => {
  setTimeout(() => {
    const data = { title: "歡迎來到傲嬌甜點店" }
    res.json(data);
    setCache(req.originalUrl, data)
  }, 2000);
});

router.get("/socket", (req: Request, res: Response): void => {
  const io = req.app.settings.io;
  console.log("準備廣播囉");
  io.emit("employee", "從 route 打 出去employee");
  res.end();
});

export default router;
