import multer from "multer";
import path from "path";
import { Message } from "../constants/messages";
import appError from "./appError";

const upload = multer({
  // 設定圖片檔案最大為10MB
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  // 只有圖片檔案jpg,png,jpeg才能通過
  fileFilter(req: any, file: any, cb: any) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".jpg" && ext !== ".png" && ext !== ".jpeg") {
      return appError(400, Message.PHOTO_TYPE_ERROR, cb);
    }
    cb(null, true);
  },
}).any();

export default upload;
