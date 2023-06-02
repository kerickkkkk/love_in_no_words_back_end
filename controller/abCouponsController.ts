import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import validator from "validator";
import { autoIncrement } from "../utils/modelsExtensions";
import appError from "../service/appError";
import handleSuccess from "../service/handleSuccess";
import AbCouponModel from "../models/abCouponModel";
import ProductType from '../models/productTypeModel'
import { isoDate } from "../utils/dayjs";

export const abCoupons = {
  // O-6-1 獲取 a+b 活動
  getAbCoupons: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {

      const abCoupons = await AbCouponModel
        .find({ isDeleted: false })
        .populate({
          path: "productsTypeA",
          select: "productsType productsTypeName"
        })
        .populate({
          path: "productsTypeB",
          select: "productsType productsTypeName"
        })
        .sort({ couponNo: 1 });
      const excludedProductsType = abCoupons.reduce((prev: any, next: any) => {
        prev.push(next.productsTypeA.productsType)
        prev.push(next.productsTypeB.productsType)
        return prev
      }, [])

      const unselectedProductTypes = await ProductType.find({
        isDeleted: false,
        productsType: { $nin: excludedProductsType }
      });

      const result = {
        list: abCoupons,
        availableList: unselectedProductTypes
      }
      // 再返回未被選擇到的產品分類
      handleSuccess(res, "成功", result);
    }
  ),
  // O-6-2 新增 a+b 活動
  createAbCoupons: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { list, discount } = req.body;

      const couponNo = await autoIncrement(AbCouponModel, 'B', 'couponNo')

      const couponModelCouponNoObj = await AbCouponModel.findOne({ couponNo });

      if (couponModelCouponNoObj !== null) {
        return next(appError(400, "A + B 活動編號重複", next));
      }

      const errorMsgArray: string[] = []

      // 確認分類長度 2 合法
      if (list.length !== 2) {
        errorMsgArray.push('A + B 活動一次只能選兩個分類');
      }


      if (!discount) {
        errorMsgArray.push('請填優惠卷折扣');
      }

      if (discount && !validator.isInt(discount.toString(), { min: 1, max: 100 })) {
        errorMsgArray.push('折扣為 1 ~ 100 數字');
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      // 確認產品分類是否合法
      const productTypesItems: any = await ProductType.find({
        isDeleted: false,
        productsType: { $in: list }
      });

      if (productTypesItems.length !== 2) {
        return next(appError(400, "A + B 產品分類編號有誤", next));
      }
      // 排除已有選到的分類就返回重複
      const productTypesAry = productTypesItems.map((item: any) => item._id)
      const existInAbCoupon = await AbCouponModel.find({
        isDeleted: false,
        $or: [
          { productsTypeA: { $in: productTypesAry } },
          { productsTypeB: { $in: productTypesAry } }
        ]
      });
      if (existInAbCoupon.length > 0) {
        return next(appError(400, "A + B 產品分類編號有重複", next));
      }
      const newItem = await AbCouponModel.create({
        couponNo,
        productsTypeA: productTypesItems[0]._id,
        productsTypeB: productTypesItems[1]._id,
        discount,
      });

      return handleSuccess(res, "A + B 活動新增成功", newItem);
    }
  ),
  // O-6-3 修改 a+b 活動 折扣數
  patchAbCoupons: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { discount } = req.body;
      const { couponNo } = req.params
      const couponModelCouponNoObj = await AbCouponModel.findOne({ couponNo });

      if (couponModelCouponNoObj === null) {
        return next(appError(400, "查無 A + B 活動編號", next));
      }

      const errorMsgArray: string[] = []

      if (!discount) {
        errorMsgArray.push('請填優惠卷折扣');
      }

      if (discount && !validator.isInt(discount.toString(), { min: 1, max: 100 })) {
        errorMsgArray.push('折扣為 1 ~ 100 數字');
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }
      const updatedItem = await AbCouponModel.findOneAndUpdate(
        {
          couponNo,
          isDeleted: false,
        },
        {
          discount
        },
        {
          returnDocument: "after",
        }
      );

      if (updatedItem === null) {
        return next(appError(400, '查無優惠卷', next));
      }

      return handleSuccess(res, "A + B 活動折扣修改成功", null);
    }
  ),
  // O-6-4 刪除 a+b 活動
  deleteAbCoupons: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { couponNo } = req.params;

      if (!couponNo) {
        return next(appError(400, 'A + B 活動編號不得為空', next));
      }

      const updatedItem = await AbCouponModel.findOneAndUpdate(
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
      if (updatedItem === null) {
        return next(appError(400, '查無 A + B 活動編號', next));
      }

      return handleSuccess(res, "A + B 活動刪除成功", null);
    }
  )
};

export default abCoupons;
