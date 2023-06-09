import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import handleSuccess from "../service/handleSuccess";
import appError from "../service/appError";
import { User } from "../models/userModel";
import { Message } from "../constants/messages";
import { DataSymbol } from "../constants/dataSymbol";
// 主要傳送需要紀錄的
interface Payload {
  id: string;
}

// interface RequestContainUser extends Request {
//     user: any;
// }

export const isAuth = async (req: any, res: Response, next: NextFunction) => {
  // 取得 JWT
  let token = "";

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(appError(400, Message.NO_TOKEN, next));
  }
  // 比對 jwt 是否正確
  const decode = await new Promise<Payload>((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET!, (err, payload) => {
      if (err) {
        reject(err);
      } else {
        resolve(payload as Payload);
      }
    });
  });
  // 取出使用者
  const currentUser = await User.findById(decode.id)
    .where("isDeleted")
    .ne(true);
  if (!currentUser) {
    return next(appError(400, Message.USER_NOT_FOUND, next));
  }
  // 順帶使用者
  req.user = currentUser;
  next();
};

// 店長權限確認
export const isOwnerAuth = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  // 取得 JWT
  let token = "";

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(appError(400, Message.NO_TOKEN, next));
  }
  // 比對 jwt 是否正確
  const decode = await new Promise<Payload>((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET!, (err, payload) => {
      if (err) {
        reject(err);
      } else {
        resolve(payload as Payload);
      }
    });
  });
  // 取出使用者
  const currentUser = await User.findById(decode.id)
    .where("isDeleted")
    .ne(true);
  if (!currentUser) {
    return next(appError(400, Message.USER_NOT_FOUND, next));
  }

  if (currentUser.titleNo != DataSymbol.OWNER) {
    return next(appError(400, Message.NOT_OWNER_AUTH, next));
  }

  next();
};

// 廚師權限確認
export const isCookAuth = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  // 取得 JWT
  let token = "";

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(appError(400, Message.NO_TOKEN, next));
  }
  // 比對 jwt 是否正確
  const decode = await new Promise<Payload>((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET!, (err, payload) => {
      if (err) {
        reject(err);
      } else {
        resolve(payload as Payload);
      }
    });
  });
  // 取出使用者
  const currentUser = await User.findById(decode.id)
    .where("isDeleted")
    .ne(true);
  if (!currentUser) {
    return next(appError(400, Message.USER_NOT_FOUND, next));
  }

  if (currentUser.titleNo != DataSymbol.COOK) {
    return next(appError(400, Message.NOT_COOK_AUTH, next));
  }

  next();
};

export const generateJWT = (user: any, res: Response) => {
  // // 產生 JWT token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_DAY,
  });

  user.password = undefined;
  handleSuccess(res, "成功", {
    user: {
      _id: user._id,
      name: user.name,
      token,
      titleNo: user.titleNo,
      title: user.title,
    },
  });
};

// 在 controller 內驗證
export const authToken = async (token: string, next: NextFunction) => {
  try {
    const decode = await new Promise<Payload>((resolve, reject) => {
      jwt.verify(token, process.env.JWT_SECRET!, (err, payload) => {
        if (err) {
          reject(err);
        } else {
          resolve(payload as Payload);
        }
      });
    });
    const currentUser = await User.findById(decode.id);
    if (!currentUser) {
      return next(appError(400, Message.USER_NOT_FOUND, next));
    }
    return true;
  } catch (error) {
    return next(appError(400, "驗證有誤", next));
  }
};
