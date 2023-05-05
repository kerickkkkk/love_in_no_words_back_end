import multer from "multer";
import path from "path";
import handleErrorAsync from "./handleErrorAsync";
import appError from "./appError";
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter(req: any, file: any, cb: any) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".jpg" && ext !== ".png" && ext !== ".jpeg") {
      cb(new Error("檔案格式錯誤，僅限上傳 jpg、jpeg 與 png 格式。"));
    }
    cb(null, true);
  },
}).any();

export default upload;
