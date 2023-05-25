import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import validator from "validator";
import { autoIncrement } from "../utils/modelsExtensions";
import appError from "../service/appError";
import handleSuccess from "../service/handleSuccess";
import CouponModel from "../models/couponModel";
import OnePlusOnes from "../models/onePlusOneModel";
import AbCouponModel from "../models/abCouponModel";
import { isoDate } from "../utils/dayjs";
// import { Message } from "../constants/messages";
import ProductManagementModel from '../models/productManagementModel';
const arrayToObjectMapId = (items: any, idName: string | number) => {
  const result = items.reduce((prev: any, next: any) => {
    prev[next[idName]] = next
    return prev
  }, {})
  return result
}
const getListAndAvailableList = async () => {
  // 挑出已被選的分類
  const selectedProductTypes = await AbCouponModel
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

  const productsTypeIdToExclude = selectedProductTypes.reduce((prev: any, next: any) => {
    prev.push(next.productsTypeA._id.toString())
    prev.push(next.productsTypeB._id.toString())
    return prev
  }, [])

  // 目前已選產品 
  const selectedProduct = await OnePlusOnes.find({ isDeleted: false })
    .populate({
      path: "product",
      select: "productNo productName"
    }).sort({ couponNo: 1 });

  // 排除選擇 與 已經選分類
  const selectedList = selectedProduct.map((item: any) => item.product.productNo)
  const availableList = await ProductManagementModel.find({
    productNo: {
      $nin: selectedList
    },
    productsType: {
      $nin: productsTypeIdToExclude
    },
    isDeleted: false
  }).populate({
    path: "productsType",
    select: "productsType productsTypeName"
  })

  return {
    list: selectedProduct,
    availableList
  }
}
export const onePlusOnes = {
  getOnePlusOnes: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {

      const result = await getListAndAvailableList()
      handleSuccess(res, "成功", result);
    }
  ),
  createOnePlusOnes: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { selectedList } = req.body;

      if (!selectedList || !Array.isArray(selectedList)) {
        return next(appError(400, "1 + 1 活動型態有誤", next));
      }

      // 取得當下可用商品
      const currentList = await getListAndAvailableList()

      // 轉換成物件 {id: objectId}
      const allListObj = [...currentList.availableList, ...currentList.list].reduce((prev: any, next: any) => {
        if (next.productNo) {
          prev[next.productNo] = next
        } else if (next.productNo === undefined && next.product) {
          prev[next.product.productNo] = next.product
        } else {
          console.log('例外名單出現!');
        }
        return prev
      }, {})

      // 排除不合規定商品
      // productNo [2, 3, 4]
      const reorganizeList = selectedList.reduce((prev, next) => {
        if (allListObj[next] === undefined) {
          prev.notAvailableList.push(next)
        } else {
          prev.availableIdList.push(next)
        }
        return prev
      }, {
        // 不存在
        notAvailableList: [],
        // 需移除
        availableIdList: [],
      })
      const originList = await OnePlusOnes.find({
        isDeleted: false
      })
      // .populate({
      //   path: "product",
      //   select: "productNo productName photoUrl price inStockAmount safeStockAmount amountStatus"
      // })
      // 合法與已存在 DB 的比較
      const originListObj = arrayToObjectMapId(originList, 'product')
      /*
        在選單內的 存在 ＤＢ 不動

        在選單內   不在 ＤＢ 新增
        不在選單    在 ＤＢ 軟刪除
      */
      const couponCurrentNumber = await OnePlusOnes.countDocuments({ couponNo: { $regex: `C.*` } });

      // 取得當下數量 在往上新增
      let indexNo = couponCurrentNumber
      // 從當下和選選單內 選擇當下符合規則
      const operateItems = Object.keys(allListObj).reduce((prev: any, next: any, index: number) => {

        // reorganizeList.availableIdList
        // 存在 DB 
        const isExist = originListObj[allListObj[next]._id] !== undefined
        // 有被選
        const isSelected = selectedList.includes(Number(next))

        // 產生唯一No 配合 index
        if (!isExist && isSelected) {
          const couponNoPlusIndex = `C${(++indexNo).toString().padStart(9, "0")}`;
          prev.itemsToAdd.push({
            couponNo: couponNoPlusIndex,
            product: allListObj[next]._id
          })
        } else if (isExist && !isSelected) {
          prev.itemsToDelete.push({
            updateOne: {
              filter: { product: allListObj[next]._id },
              update: { $set: { isDeleted: true } }
            }
          })
        }
        return prev
      }, {
        itemsToAdd: [],
        itemsToDelete: []
      })

      // 批次寫入
      operateItems.itemsToAdd?.length > 0 && await OnePlusOnes.insertMany(operateItems.itemsToAdd)
      operateItems.itemsToDelete?.length > 0 && await OnePlusOnes.bulkWrite(operateItems.itemsToDelete)

      return handleSuccess(res, "1 + 1 活動編輯成功", {
        // 選擇列表
        selectedList,
        currentList,
        originListObj,
        originList,
        allListObj,
        reorganizeList,
        operateItems,
        // 不符合 或者 未在名單內
        notAvailableList: reorganizeList.notAvailableList
      });
    }
  ),
  deleteOnePlusOnes: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { couponNo } = req.params;
      console.log(couponNo === 'C000000001')
      if (!couponNo) {
        return next(appError(400, '1 + 1 活動不得為空', next));
      }

      const updatedObj = await OnePlusOnes.findOneAndUpdate(
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
        return next(appError(400, '查無 1 + 1 活動', next));
      }

      return handleSuccess(res, "1 + 1 活動刪除成功", null);
    }
  )
};

export default onePlusOnes;
