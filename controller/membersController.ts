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
      const revisedAt: null | string = null;
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
      interface Query {
        isDeleted: boolean;
        phone?: string;
      }
      const { phone, page } = req.query as { phone?: string, page?: string };
      const perPage = 10; // 每頁回傳的筆數
      const query: Query = { isDeleted: false };
      if (phone !== undefined && phone !== '') {
        query.phone = phone;
      }
      const currentPage = parseInt(page ?? '1'); // 解析頁碼參數，預設為 1
      const skipCount = (currentPage - 1) * perPage; // 要跳過的筆數

      try {
        const totalNum = await Member.countDocuments(query);
        const members = await Member.find(query).skip(skipCount).limit(perPage);

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
        const meta: Meta = {
          pagination: {
            total: membersList.length,
            perPage: perPage,
            currentPage: currentPage,
            lastPage: totalPages,
            nextPage: currentPage < totalPages ? currentPage + 1 : null,
            prevPage: currentPage > 1 ? currentPage - 1 : null,
            from: skipCount + 1,
            to: skipCount + membersList.length,
          },
        };
        return handleSuccess(res, Message.RESULT_SUCCESS, {
          membersList,
          meta,
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
      try {
        const memberId = req.params.id;
        const updatedFields = req.body;

        // Ensure that the member exists and is not deleted
        const existingMember = await Member.findOne({
          _id: memberId,
          isDeleted: false,
        });

        if (!existingMember) {
          return next(appError(404, Message.USER_NOT_FOUND, next));
        }

        // Validate input fields
        const { name, phone } = updatedFields;
        const errorMsgArray = [];

        if (!name) {
          errorMsgArray.push(Message.NEED_INPUT_NAME);
        }

        if (!phone || !validator.isMobilePhone(phone, "zh-TW")) {
          errorMsgArray.push(Message.NEED_INPUT_PHONE);
        }

        if (errorMsgArray.length > 0) {
          return next(appError(400, errorMsgArray.join(";"), next));
        }

        // Check if the phone number already exists for other members
        if (phone !== existingMember.phone) {
          const existingMemberWithSamePhone = await Member.findOne({
            phone: phone,
            isDeleted: false,
            titleNo: existingMember.titleNo,
            _id: { $ne: existingMember._id },
          });

          if (existingMemberWithSamePhone) {
            errorMsgArray.push(Message.SAME_PHONE_REGISTERED);
            return next(appError(400, errorMsgArray.join(";"), next));
          }
        }

        // Update the member
        const updatedMember = await Member.findByIdAndUpdate(
          memberId,
          { ...updatedFields, updatedAt: new Date() },
          { new: true }
        );

        handleSuccess(res, Message.REVISE_SUCCESS, updatedMember);
      } catch (err) {
        return next(appError(500, "修改會員失敗", next));
      }
    }
  )

};

export default members;
