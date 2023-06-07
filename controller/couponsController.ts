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
      const searchType: {
        isDeleted: boolean;
        isDisabled?: boolean;
      } = { isDeleted: false }

      if (req.user && req.user.titleNo === 1) {
        searchType.isDisabled = false
      }
      const coupons = await CouponModel.find(searchType).sort({ couponNo: 1 });
      handleSuccess(res, "成功", coupons);
    }
  ),
  createCoupons: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { couponName, couponCode, discount, isDisabled } = req.body;

      const couponNo = await autoIncrement(CouponModel, 'A', 'couponNo')

      const couponModelCouponNoObj = await CouponModel.findOne({ couponNo });

      if (couponModelCouponNoObj !== null) {
        return next(appError(400, "優惠卷編號重複", next));
      }

      const errorMsgArray: string[] = []

      if (!couponName) {
        errorMsgArray.push('請填優惠卷名稱');
      }

      if (!couponCode) {
        errorMsgArray.push('請填優惠卷代碼');
      }

      if (!discount) {
        errorMsgArray.push('請填優惠卷折扣');
      }
      if (discount && !validator.isInt(discount.toString(), { min: 1, max: 100 })) {
        errorMsgArray.push('折扣為 1 ~ 100 數字');
      }
      if (typeof isDisabled !== 'boolean') {
        errorMsgArray.push('啟用狀態有誤');
      }
      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      const couponModelObj = await CouponModel.findOne({
        $and: [
          { $or: [{ couponCode }, { couponName }] },
          { isDeleted: false },
        ]
      });

      if (couponModelObj !== null) {
        return next(appError(400, "優惠卷號碼或優惠券名稱重複", next));
      }

      const newObj = await CouponModel.create({
        couponNo,
        couponName,
        couponCode,
        discount,
        isDisabled
      });

      return handleSuccess(res, "優惠活動新增成功", newObj);
    }
  ),
  patchCoupons: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { couponNo } = req.params;
      const { couponName, couponCode, discount, isDisabled } = req.body;

      const couponModelForCouponNoObj = await CouponModel.findOne({ couponNo, isDeleted: false })

      if (couponModelForCouponNoObj === null) {
        return next(appError(400, '優惠卷編號有誤', next));
      }

      const errorMsgArray: string[] = []

      if (!couponName) {
        errorMsgArray.push('請填優惠卷名稱');
      }

      if (!couponCode) {
        errorMsgArray.push('請填優惠卷代碼');
      }

      if (!discount) {
        errorMsgArray.push('請填優惠卷折扣');
      }
      if (discount && !validator.isInt(discount.toString(), { min: 1, max: 100 })) {
        errorMsgArray.push('折扣為 1 ~ 100 數字');
      }
      if (typeof isDisabled !== 'boolean') {
        errorMsgArray.push('啟用狀態有誤');
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      const couponModelObj = await CouponModel.findOne({
        $and: [
          { $or: [{ couponCode }, { couponName }] },
          { isDeleted: false },
          //  有一鍵更改停用 允許寫入重複(該優惠卷)的 couponCode couponName
          { couponNo: { $ne: couponNo } }
        ]
      });

      if (couponModelObj !== null) {
        return next(appError(400, "優惠卷號碼或優惠券名稱重複", next));
      }

      const updatedCoupon = await CouponModel.findOneAndUpdate(
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

      if (updatedCoupon === null) {
        return next(appError(400, '查無優惠卷', next));
      }

      return handleSuccess(res, "優惠碼活動修改成功", updatedCoupon);
    }
  ),
  softDeleteCoupons: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { couponNo } = req.params;

      if (!couponNo) {
        return next(appError(400, '優惠卷不得為空', next));
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
        return next(appError(400, '查無優惠券', next));
      }

      return handleSuccess(res, "優惠活動刪除成功", updatedObj);
    }
  )
};

export default coupons;
