import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import validator from "validator";
import handleErrorAsync from "../service/handleErrorAsync";
import appError from "../service/appError";
import { User } from "../models/userModel";
import { Member } from "../models/memberModel";
import { generateJWT } from "../middleware/auth";
import handleSuccess from "../service/handleSuccess";
import { isoDate, slashDate } from "../utils/dayjs";
import { autoIncrement } from "../utils/modelsExtensions";
import { Message } from "../constants/messages";
import { Meta } from "../types/Pagination";
import mongoose from "mongoose";
import { isEffectVal } from "../utils/common";
export const users = {
  // O-1-1  獲取使用者列表API
  getUsers: handleErrorAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { page } = req.query;
      // 頁碼不是數字就返回錯誤訊息
      if (Number.isNaN(Number(page))) {
        return next(appError(400, Message.PAGE_NEED_IN_NUMBER, next));
      }
      const pageNum = Number(page);
      // 進入User跟Member Collection獲取沒被刪除的資料，並由舊到新排列
      let users: any[] = [];
      let members: any[] = [];
      const queryIsDeleted = { isDeleted: false };
      const usersTotal = await User.countDocuments(queryIsDeleted);
      const membersTotal = await Member.countDocuments(queryIsDeleted);
      const totalAmount = usersTotal + membersTotal;
      const perPage = 10;
      const skipCount = (pageNum - 1) * perPage;
      if (skipCount < usersTotal && pageNum * perPage < usersTotal) {
        users = await User.find(queryIsDeleted)
          .skip(skipCount)
          .limit(perPage)
          .sort({
            createdAt: "asc",
          });
      }
      if (skipCount < usersTotal && pageNum * perPage > usersTotal) {
        users = await User.find(queryIsDeleted)
          .skip(skipCount)
          .limit(perPage)
          .sort({
            createdAt: "asc",
          });
        members = await Member.find(queryIsDeleted)
          .limit(perPage - (usersTotal % perPage))
          .sort({
            createdAt: "asc",
          });
      }

      if (skipCount > usersTotal) {
        members = await Member.find(queryIsDeleted)
          .skip(skipCount - usersTotal)
          .limit(perPage)
          .sort({
            createdAt: "asc",
          });
      }

      // 店家人員中取出需要的資訊
      const clerksList = users.map(
        ({
          _id,
          number,
          name,
          phone,
          email,
          titleNo,
          title,
          createdAt,
          isDisabled,
        }) => {
          const transferDate = slashDate(createdAt);
          return {
            _id,
            number,
            name,
            phone,
            email,
            titleNo,
            title,
            createdAt: transferDate,
            isDisabled,
          };
        }
      );
      // 會員人員中取出需要的資訊
      const membersList = members.map(
        ({
          _id,
          number,
          name,
          phone,
          titleNo,
          title,
          createdAt,
          isDisabled,
        }) => {
          const transferDate = slashDate(createdAt);
          return {
            _id,
            number,
            name,
            phone,
            titleNo,
            title,
            createdAt: transferDate,
            isDisabled,
          };
        }
      );
      // 整合為單一使用者數組
      const usersList = [...clerksList, ...membersList];

      // 迴圈確認是否有符合輸入的頁碼資料
      for (let p = 0; p <= Math.ceil(totalAmount / perPage); p++) {
        const lastPage = Math.ceil(totalAmount / perPage);
        const currentPage = pageNum;
        if (p == pageNum) {
          const meta: Meta = {
            pagination: {
              total: totalAmount,
              perPage: 10,
              currentPage: currentPage,
              lastPage: lastPage,
              nextPage: currentPage == lastPage ? null : currentPage + 1,
              prevPage: currentPage == 1 ? null : currentPage - 1,
              from: (currentPage - 1) * perPage + 1,
              to:
                currentPage * perPage > totalAmount
                  ? totalAmount
                  : currentPage * perPage,
            },
          };

          // 返回成功相對應資訊
          return handleSuccess(res, Message.RESULT_SUCCESS, {
            usersList,
            meta,
          });
        }
      }

      // 頁碼可能超過實際頁數、小數點頁碼、負數頁碼等情況
      return next(appError(400, Message.PAGE_NOT_FOUND, next));
    }
  ),

  // O-1-2 新增使用者API
  creatUser: handleErrorAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      // 姓名 電話 職位 密碼
      const { name, phone, email, titleNo, isDisabled, password } = req.body;
      // title
      const titleMap: string[] = ["", "店長", "店員", "廚師", "會員"];

      const errorMsgArray = [];
      // 驗證
      if (!isEffectVal(name)) {
        errorMsgArray.push(Message.NEED_INPUT_NAME);
      }
      if (!isEffectVal(phone) || !validator.isMobilePhone(phone, "zh-TW")) {
        errorMsgArray.push(Message.NEED_INPUT_PHONE);
      }

      if (titleNo == 1) {
        if (!isEffectVal(email) || !validator.isEmail(email)) {
          errorMsgArray.push(Message.NEED_EMAIL);
        }
      }

      // 如果不是會員的職位代號的話需要驗證密碼
      if (titleNo != 4) {
        if (!password || !validator.isLength(password, { min: 8 })) {
          errorMsgArray.push(Message.NEED_INPUT_PASSWORD);
        }
      }
      if (!isEffectVal(titleNo)) {
        errorMsgArray.push(Message.NEED_INPUT_TITLENO);
      } else if (!validator.isInt(titleNo.toString(), { min: 1, max: 4 })) {
        errorMsgArray.push(Message.NEED_INPUT_TITLENO);
      }

      let hasSamePhone = null;

      // 依照職位代號去相對應的collection搜尋是否已有相同電話號碼
      if (titleNo != 4) {
        hasSamePhone = await User.findOne({ phone, isDeleted: false });
      } else {
        hasSamePhone = await Member.findOne({ phone, isDeleted: false });
      }

      if (hasSamePhone != null) {
        errorMsgArray.push(Message.SAME_PHONE_REGISTERED);
      }

      if (!(isDisabled === true || isDisabled === false)) {
        errorMsgArray.push(Message.NEED_INPUT_STATUS);
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      const title = titleMap[titleNo];

      // 編號依照職位種別去計算目前有幾筆該職位種別並+1
      const autoIncrementIndex =
        titleNo != 4
          ? await autoIncrement(User, "A")
          : await autoIncrement(Member, "B");

      // 職位代號不是4的話，在user collection新增，如果是4表示是會員，在member collection新增
      if (titleNo == 1) {
        // 加密
        const bcryptPassword = await bcrypt.hash(password, 12);
        await User.create({
          name,
          phone,
          email,
          password: bcryptPassword,
          titleNo,
          title,
          isDisabled,
          number: autoIncrementIndex,
        });
      } else if (titleNo == 4) {
        await Member.create({
          name,
          phone,
          titleNo,
          title,
          isDisabled,
          number: autoIncrementIndex,
        });
      } else {
        // 加密
        const bcryptPassword = await bcrypt.hash(password, 12);
        await User.create({
          name,
          phone,
          password: bcryptPassword,
          titleNo,
          title,
          isDisabled,
          number: autoIncrementIndex,
        });
      }
      handleSuccess(res, Message.CREATE_SUCCESS, null);
    }
  ),
  // O-1-3 修改使用者API
  updateUser: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      // 姓名 電話 職位 密碼
      const { name, phone, email, titleNo, isDisabled, password } = req.body;

      const userId: string = req.params.id;
      let hasRightUser = null;
      // 排除已經軟刪除的人員
      try {
        if (titleNo != 4) {
          hasRightUser = await User.findById(userId)
            .where("isDeleted")
            .ne(true);
        } else {
          hasRightUser = await Member.findById(userId)
            .where("isDeleted")
            .ne(true);
        }

        if (hasRightUser === null) {
          return next(appError(400, Message.ID_NOT_FOUND, next));
        }
      } catch (err) {
        // 當request有傳userId，但是位數不夠或過長，mongoose不能轉換成有效id時
        if (err instanceof mongoose.Error.CastError) {
          return next(appError(400, Message.ID_NOT_FOUND, next));
        }
      }
      // title
      const titleMap: string[] = ["", "店長", "店員", "廚師", "會員"];

      const errorMsgArray = [];
      // 驗證
      if (!isEffectVal(name)) {
        errorMsgArray.push(Message.NEED_INPUT_NAME);
      }
      if (!isEffectVal(phone) || !validator.isMobilePhone(phone, "zh-TW")) {
        errorMsgArray.push(Message.NEED_INPUT_PHONE);
      }

      if (titleNo == 1) {
        if (!isEffectVal(email) || !validator.isEmail(email)) {
          errorMsgArray.push(Message.NEED_EMAIL);
        }
      }

      // 如果不是會員的職位代號的話需要驗證密碼
      if (titleNo != 4) {
        if (
          !isEffectVal(password) ||
          !validator.isLength(password, { min: 8 })
        ) {
          errorMsgArray.push(Message.NEED_INPUT_PASSWORD);
        }
      }

      if (
        !isEffectVal(titleNo) ||
        !validator.isInt(titleNo.toString(), { min: 1, max: 4 })
      ) {
        errorMsgArray.push(Message.NEED_INPUT_TITLENO);
      }

      // 會員與店家人員不可直接透過職位代號轉換

      if (
        (hasRightUser?.titleNo != 4 && titleNo == 4) ||
        (hasRightUser?.titleNo == 4 && titleNo != 4)
      ) {
        errorMsgArray.push(Message.TITLENO_TRANSFER_ERROR);
      }

      // 如果電話號碼與原本不同
      if (phone != hasRightUser?.phone) {
        let hasSamePhone = null;
        // 依照職位代號去相對應的collection搜尋是否已有相同電話號碼
        if (hasRightUser?.titleNo != 4) {
          hasSamePhone = await User.findOne({ phone, isDeleted: false });
        } else {
          hasSamePhone = await Member.findOne({ phone, isDeleted: false });
        }

        if (hasSamePhone != null) {
          errorMsgArray.push(Message.SAME_PHONE_REGISTERED);
        }
      }

      if (typeof isDisabled !== "boolean") {
        errorMsgArray.push(Message.NEED_INPUT_STATUS);
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      interface IUserParam {
        name: string;
        phone: string;
        email?: string;
        password?: string;
        titleNo: number;
        title: string;
        isDisabled: boolean;
        revisedAt: string;
      }

      const title = titleMap[titleNo];

      let params: IUserParam = {
        name,
        phone,
        titleNo,
        title,
        isDisabled,
        revisedAt: isoDate(),
      };
      if (titleNo == 1) {
        params.email = email;
      }

      // 職位代號不是4的話，在user collection新增，如果是4表示是會員，在member collection更新
      if (titleNo != 4) {
        if (password) {
          // 加密
          const bcryptPassword = await bcrypt.hash(password, 12);
          params.password = bcryptPassword;
        }
        await User.findByIdAndUpdate(userId, params);
      } else {
        await Member.findByIdAndUpdate(userId, params);
      }

      handleSuccess(res, Message.REVISE_SUCCESS, null);
    }
  ),
  // O-1-4 刪除使用者API
  softDeleteUser: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const userId = req.params.id;
      const titleNo = req.params.titleNo;

      if (
        !isEffectVal(titleNo) ||
        !validator.isInt(titleNo.toString(), { min: 1, max: 4 })
      ) {
        return next(appError(400, Message.NEED_INPUT_TITLENO, next));
      }

      // 排除已經被軟刪除的人員
      let hasRightUser = {} || null;
      try {
        if (titleNo != 4) {
          hasRightUser = await User.findById(userId)
            .where("isDeleted")
            .ne(true);
        } else {
          hasRightUser = await Member.findById(userId)
            .where("isDeleted")
            .ne(true);
        }

        if (hasRightUser === null) {
          return next(appError(400, Message.ID_NOT_FOUND, next));
        }
      } catch (err) {
        // 當request有傳userId，但是位數不夠或過長，mongoose不能轉換成有效id時
        if (err instanceof mongoose.Error.CastError) {
          return next(appError(400, Message.ID_NOT_FOUND, next));
        }
      }

      const deleteItem = {
        isDeleted: true,
        deletedAt: isoDate(),
      };
      if (titleNo != 4) {
        await User.findByIdAndUpdate(userId, deleteItem);
      } else {
        await Member.findByIdAndUpdate(userId, deleteItem);
      }

      handleSuccess(res, Message.DELETE_SUCCESS, null);
    }
  ),
  signUp: handleErrorAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      // 姓名 電話 職位(預設給 4 ) 密碼
      const { name, phone, email, password, confirmPassword, isDisabled } =
        req.body;

      // 驗證
      if (!name || !phone || !password || !confirmPassword || !email) {
        return next(appError(400, "欄位不可為空", next));
      }

      if (password !== confirmPassword) {
        return next(appError(400, "輸入密碼與確認密碼需相同", next));
      }

      if (!validator.isLength(password, { min: 8 })) {
        return next(appError(400, "密碼長度需大於 8 碼", next));
      }

      if (!validator.isLength(phone, { min: 8 })) {
        return next(appError(400, "電話長度需大於 8 碼", next));
      }

      const hasSamePhone = await User.findOne({ phone, isDeleted: false });
      if (hasSamePhone !== null) {
        return next(appError(400, "電話重複", next));
      }

      if (!isEffectVal(email) || !validator.isEmail(email)) {
        return next(appError(400, Message.NEED_EMAIL, next));
      }
      let revisedAt: null | string = null;
      if (isDisabled) {
        revisedAt = isoDate();
      } else {
        revisedAt = null;
      }

      // 加密
      const bcryptPassword = await bcrypt.hash(password, 12);
      const autoIncrementIndex = await autoIncrement(User, "A");

      const newUser = await User.create({
        name,
        phone,
        password: bcryptPassword,
        email,
        titleNo: 1,
        title: "店長",
        isDisabled,
        revisedAt,
        number: autoIncrementIndex,
      });

      generateJWT(newUser, res);
    }
  ),
  // 登入
  login: handleErrorAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { phone, password } = req.body;
      // 驗證
      if (!phone || !password) {
        return next(appError(400, "欄位不可為空", next));
      }

      if (!validator.isLength(password, { min: 8 })) {
        return next(appError(400, "密碼長度需大於 8 碼", next));
      }

      const user: any = await User.findOne({ phone, isDeleted: false })?.select(
        "+password"
      );
      let checkPassword = null;
      if (user) {
        checkPassword = await bcrypt.compare(password, user.password);
      }
      if (!checkPassword || user === null) {
        return next(appError(400, "電話或密碼錯誤", next));
      } else {
        generateJWT(user, res);
      }
    }
  ),

  resetPassword: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction): Promise<void> => {
      const { password, confirmPassword } = req.body;
      if (!req.user) {
        return next(appError(400, "沒有使用者或者沒有權限", next));
      }

      // 驗證
      if (!password || !confirmPassword) {
        return next(appError(400, "欄位不可為空", next));
      }

      if (password !== confirmPassword) {
        return next(appError(400, "輸入密碼與確認密碼需相同", next));
      }

      if (!validator.isLength(password, { min: 8 })) {
        return next(appError(400, "密碼長度需大於 8 碼", next));
      }

      const bcryptPassword = await bcrypt.hash(password, 12);
      const user = await User.findByIdAndUpdate(req.user, {
        password: bcryptPassword,
      });
      generateJWT(user, res);
    }
  ),
  profile: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      handleSuccess(res, "成功", req.user);
    }
  ),
  getUser: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const userId = req.params.id;

      // 排除已經被軟廚的人員
      const hasRightUser = await User.findById(userId)
        .where("isDeleted")
        .ne(true)
        .select("+createdAt");
      if (hasRightUser === null) {
        return next(appError(400, "查無使用者", next));
      }
      handleSuccess(res, "成功", hasRightUser);
    }
  ),
};

export default users;
