import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import validator from "validator";
import { autoIncrement } from "../utils/modelsExtensions";
import appError from "../service/appError";
import handleSuccess from "../service/handleSuccess";
import CouponModel from "../models/couponModel";
import { isoDate } from "../utils/dayjs";
import { Message } from "../constants/messages";

export const coupons = {
  getCoupons: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const coupons = await CouponModel.find({ isDeleted: false }).sort({ couponNo: 1 });
      handleSuccess(res, "成功", coupons);
    }
  ),
  createCoupons: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { couponName, couponCode, discount, isDisabled = false } = req.body;

      const couponNo = await autoIncrement(CouponModel, 'A', 'couponNo')
      const couponModelObj = await CouponModel.findOne({ $or: [{ couponNo }, { couponName }] });
      const errorMsgArray: string[] = []

      if (couponModelObj !== null) {
        errorMsgArray.push('優惠卷編號或代碼重複');
      }
      if (!couponName) {
        errorMsgArray.push('請填優惠卷名稱');
      }

      if (!couponCode) {
        errorMsgArray.push('請填優惠卷代碼');
      }

      if (!discount) {
        errorMsgArray.push('請填優惠卷折扣');
      }
      if (!validator.isInt(discount.toString(), { min: 1, max: 100 })) {
        errorMsgArray.push('折扣為 1 ~ 100 數字');
      }
      if (typeof isDisabled !== 'boolean') {
        errorMsgArray.push('啟用狀態有誤');
      }
      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }
      // 取得 tableCode 第一筆

      const newObj = await CouponModel.create({
        couponNo,
        couponName,
        couponCode,
        discount,
        isDisabled
      });

      return handleSuccess(res, Message.RESULT_SUCCESS, newObj);
    }
  ),
  patchCoupons: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { couponNo } = req.params;
      const { couponName, couponCode, discount, isDisabled = false } = req.body;
      const errorMsgArray: string[] = []
      const couponModelObj = await CouponModel.findOne({ couponNo, isDeleted: false })

      if (couponModelObj === null) {
        return next(appError(400, '優惠卷編號有誤', next));
      }

      if (!couponName) {
        errorMsgArray.push('請填優惠卷名稱');
      }

      if (!couponCode) {
        errorMsgArray.push('請填優惠卷代碼');
      }

      if (!discount) {
        errorMsgArray.push('請填優惠卷折扣');
      }
      if (!validator.isInt(discount.toString(), { min: 1, max: 100 })) {
        errorMsgArray.push('折扣為 1 ~ 100 數字');
      }
      if (typeof isDisabled !== 'boolean') {
        errorMsgArray.push('啟用狀態有誤');
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      const updatedSeat = await CouponModel.findOneAndUpdate(
        {
          couponNo,
          isDeleted: false,
        },
        {
          couponName,
          couponCode,
          discount,
          isDisabled,
          revisedAt: isoDate(),
          stoppedAt: isDisabled ? isoDate() : null
        },
        {
          returnDocument: "after",
        }
      );

      if (updatedSeat === null) {
        errorMsgArray.push('查無優惠卷');
      }
      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      return handleSuccess(res, "修改成功", null);
    }
  ),
  softDeleteCoupons: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { couponNo } = req.params;

      const errorMsgArray: string[] = []

      if (!couponNo) {
        errorMsgArray.push('優惠卷不得為空');
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      const updatedObj = await CouponModel.findOneAndUpdate(
        {
          couponNo,
          isDeleted: false,
        },
        {
          isDeleted: true,
          deleteAt: isoDate()
        },
        {
          returnDocument: "after",
        }
      );
      if (updatedObj === null) {
        errorMsgArray.push('查無優惠券');
      }
      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      return handleSuccess(res, Message.RESULT_SUCCESS, updatedObj);
    }
  )
};

export default coupons;
