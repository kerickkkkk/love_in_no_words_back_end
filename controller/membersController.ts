import { Request, Response, NextFunction } from "express";
import validator from "validator";
import handleErrorAsync from "../service/handleErrorAsync";
import appError from "../service/appError";
import { Member } from "../models/memberModel";
import handleSuccess from "../service/handleSuccess";
import { isoDate, slashDate } from "../utils/dayjs";
import { autoIncrement } from "../utils/modelsExtensions";
import { Message } from "../constants/messages";
import { Meta } from "../types/Pagination";
export const members = {
  //S-4-1 加入會員
  signUpMember: handleErrorAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      // 姓名 電話 職位(預設給 4 ) 密碼
      const { name, phone } = req.body;
      // title
      const titleMap: string[] = ["", "店長", "店員", "廚師", "會員"];
      // 驗證
      if (!name || !phone) {
        return next(appError(400, "欄位不可為空", next));
      }
      if (!validator.isMobilePhone(phone, "zh-TW")) {
        return next(appError(400, "電話長度需大於 8 碼", next));
      }
      const hasSamePhone = await Member.findOne({ phone });
      if (hasSamePhone !== null) {
        return next(appError(400, "電話重複", next));
      }
      let revisedAt: null | string = null;
      // 加密
      const autoIncrementIndex = await autoIncrement(Member, "B");

      const newMember = await Member.create({
        name,
        phone,
        revisedAt,
        number: autoIncrementIndex,
        isDisabled: false,
      });
      // generateJWT(newMember, res);
      //
      handleSuccess(res, Message.REVISE_SUCCESS, newMember);
    }
  ),
  //S-4-2 查詢會員
  searchMember: handleErrorAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { phone, page } = req.query;
      const perPage = 10; // 每頁回傳的筆數
      if (!phone) {
        return next(appError(400, "電話長度需大於 8 碼", next));
      }
      try {
        const totalNum = await Member.countDocuments({ phone }); // 搜尋符合該電話的會員總數
        const members = await Member.find({ phone }).limit(perPage); // 搜尋符合該電話的會員資料，並使用分頁的方式回傳結果
        const membersList = members.map((member) => {
          const { _id, number, name, phone, createdAt, isDisabled } = member;
          const transferDate = slashDate(createdAt);
          return {
            _id,
            number,
            name,
            phone,
            createdAt: transferDate,
            isDisabled,
          };
        });
        const totalPages = Math.ceil(totalNum / perPage); // 總頁數
        return handleSuccess(res, Message.RESULT_SUCCESS, {
          membersList,
          totalNum,
          totalPages,
        });
      } catch (err) {
        return next(appError(400, "查詢會員失敗", next));
      }
    }
  ),
  //S-4-3 刪除會員
  softDeleteMember: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const memberUId = req.params.id;
      // 排除已經被軟刪除的人員
      let hasRightUser = {} || null;
      hasRightUser = await Member.findById(memberUId)
        .where("isDeleted")
        .ne(true);
      if (hasRightUser === null) {
        return next(appError(400, Message.ID_NOT_FOUND, next));
      }
      const deleteItem = {
        isDeleted: true,
        deletedAt: isoDate(),
        _id: req.params.id, // 假設使用者 ID 存在 req.params.id
      };
      await Member.findByIdAndUpdate(memberUId, deleteItem);
      handleSuccess(res, Message.DELETE_SUCCESS, null);
    }
  ),
  //S-4-4 修改會員
  updateMember: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const memberUId: string = req.params.id;
      const hasRightUser = await Member.findById(memberUId)
        .where("isDeleted")
        .ne(true);
      if (hasRightUser === null) {
        return next(appError(400, Message.ID_NOT_FOUND, next));
      }
      // 姓名 電話 職位 密碼
      const { name, phone } = req.body;
      let errorMsgArray = [];
      // 驗證
      if (!name) {
        errorMsgArray.push(Message.NEED_INPUT_NAME);
      }
      if (!phone || !validator.isMobilePhone(phone, "zh-TW")) {
        errorMsgArray.push(Message.NEED_INPUT_PHONE);
      }
      // 如果電話號碼與原本不同
      if (phone != hasRightUser.phone) {
        let hasSamePhone = null;
        // 依照職位代號去相對應的collection搜尋是否已有相同電話號碼
        if (hasRightUser.titleNo != 4) {
          hasSamePhone = await Member.findOne({ phone });
        }
        if (hasSamePhone != null) {
          errorMsgArray.push(Message.SAME_PHONE_REGISTERED);
        }
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      interface MemberParam {
        name: string;
        phone: string;
      }
      const params: MemberParam = {
        name,
        phone,
      };
      await Member.findByIdAndUpdate(memberUId, params);
      handleSuccess(res, Message.REVISE_SUCCESS, null);
    }
  ),
};

export default members;
