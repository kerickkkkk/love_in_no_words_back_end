import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import handleSuccess from "../service/handleSuccess";
import appError from "../service/appError";
import TableManagementModel from "../models/tableManagementModel";
import ProductManagementModel from '../models/productManagementModel';
import Order from "../models/orderModel";
import CouponModel from "../models/couponModel"
import OrderDetail from "../models/orderDetailModel";
import { combinedDateTimeString, period } from "../utils/dayjs"
export const orders = {
  handleOrder: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const {
        tableName,
        products: inputProducts,
        time,
        couponNo
      } = req.body

      if (inputProducts.length <= 0) {
        return next(appError(400, "購物車內無商品，請選購", next));
      }

      const arrayPutKeyToObj = (array: any[], columnName: string) => {
        const result = array.reduce((prev: any, next: any) => {
          prev[next[columnName]] = next
          return prev
        }, {})
        return result
      }

      // 沒有商品編號 商品編號重複 商品數量要大於零
      const checkInputProduct = inputProducts.reduce((prev: any, next: any, i: number) => {
        if (next.productNo === undefined) {
          prev.noProductNo += 1
        }

        prev.repeatProductNo.push(next.productNo)
        if (i === inputProducts.length - 1) {
          prev.repeatProductNo = prev.repeatProductNo.filter((id: number, index: number, arr: any) => {
            return arr.indexOf(id) !== index
          })
        }

        if (next.productNo !== undefined && next.qty <= 0) {
          prev.qtyLessZero.push(next.productNo)
        }
        return prev
      }, {
        noProductNo: 0,
        repeatProductNo: [],
        qtyLessZero: []
      })

      if (checkInputProduct.noProductNo > 0 || checkInputProduct.repeatProductNo.length > 0 || checkInputProduct.qtyLessZero.length > 0) {
        let errMsg = ''
        if (checkInputProduct.noProductNo > 0) {
          errMsg += `有 ${checkInputProduct.noProductNo} 商品編號有誤。;`
        }
        if (checkInputProduct.repeatProductNo.length > 0) {
          errMsg += `商品編號： ${[...new Set(checkInputProduct.repeatProductNo)].join()} 重複;`
        }
        if (checkInputProduct.qtyLessZero > 0) {
          errMsg += `商品編號： ${[...new Set(checkInputProduct.qtyLessZero)].join()} 數量不得小於零;`
        }
        return next(appError(400, errMsg, next));
      }


      // 確認購物車內商品編號是否有誤
      const inputProductsObj = arrayPutKeyToObj(inputProducts, 'productNo')
      // 取得 商品編號
      const productNoList = inputProducts.map((item: {
        productNo: number;
        qty: number;
        description?: string;
      }) => item.productNo)

      // 撈取合法的商品
      const tempProducts = await ProductManagementModel.find({
        productNo: {
          $in: productNoList
        },
        isDeleted: false
      }).populate({
        path: "productsType",
        select: "productsType productsTypeName"
      }).lean()

      if (tempProducts.length < productNoList.length) {
        const tempProductsObj = arrayPutKeyToObj(tempProducts, 'productNo')
        const errorList = productNoList.filter((no: any) => (tempProductsObj[no] === undefined))
        return next(appError(400, `訂單產品編號有誤: ${errorList.join(';')}`, next));
      }

      // 驗證
      const errorMsgArray: string[] = []
      const tableObj = await TableManagementModel.findOne({
        tableName,
        isDisabled: false,
        isDeleted: false
      })

      if (tableObj === null) {
        errorMsgArray.push('查無座位');
      }

      const couponObj = await CouponModel.findOne({
        couponNo,
        isDisabled: false,
        isDeleted: false
      })
      if (couponNo) {
        if (couponObj === null) {
          errorMsgArray.push('查無優惠代碼');
        }
      }

      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      // 出餐數量大於於庫存量阻擋掉 
      const dangerAmount = tempProducts.filter(item => {
        return item.inStockAmount < inputProductsObj[item.productNo].qty
      }).map(item => item.productName).join(';')

      if (dangerAmount.length > 0) {
        return next(appError(400, `庫存量不足: ${dangerAmount}`, next));
      }

      // 計算商品 總價
      let totalTime = 0
      let totalPrice = 0
      // 商品內優惠活動 (未計算)

      // 訂單優惠碼
      const products = tempProducts.reduce((prev: any[], next, index) => {
        const { qty, description } = inputProducts[index]
        const product = {
          ...next,
          qty,
          description,
          subTotal: next.price * qty
        }
        totalTime += next.productionTime * qty
        totalPrice += next.price * qty
        prev.push(product)
        return prev
      }, [])
      const result: any = {
        tableName: tableObj?.tableName,
        orderList: products,
        totalTime,
        totalPrice
      }

      if (couponObj !== null) {
        const originalPrice = totalPrice
        totalPrice = Math.round(totalPrice * (100 - Number(couponObj.discount)) * 100 / 10000)
        result.couponNo = couponNo
        result.couponName = couponObj.couponName
        result.discount = originalPrice - totalPrice
        result.totalPrice = totalPrice
      }
      // 訂單試算
      if (req.path === "/calculate/total-price") {
        return handleSuccess(res, "成功", result);
        // 建立訂單
      } else if (req.path === "/") {
        // 判斷 是否訂單內有 數量不足

        // 寫入資料庫
        // 確定方法後再去整個文件改
        // const orderNo = await autoIncrementNumber(Order)
        const orderNo = combinedDateTimeString()

        const newOrderDetail = await OrderDetail.create({
          orderNo,
          orderList: products,
          tableNo: tableObj?.tableNo,
          tableName: tableObj?.tableName,
          totalTime,
          status: "未出餐",
          couponNo: result.couponNo,
          couponName: result.couponName,
          discount: result.discount,
          totalPrice: result.totalPrice
        })

        const newOrder = await Order.create({
          orderNo,
          orderStatus: "已結帳",
          time: period(),
          tableNo: tableObj?.tableNo,
          tableName: tableObj?.tableName,
          orderDetail: newOrderDetail._id
        })

        // 目前 建立失敗會回失敗
        if (newOrder === null || newOrder === null) {
          return next(appError(400, "訂單或訂單詳細建立有誤", next));
        }

        // 取得新增訂單 
        const order = await Order.findOne({
          orderNo,
          isDeleted: false
        }).populate({
          path: "orderDetail",
          select: "orderList totalTime discount totalPrice status couponNo couponName"
        })

        // 通知廚師 要注意 手機與使用者名稱是否會被看到
        const { io } = req.app.settings;
        io.emit("chef", order);

        // 更新商品庫存與庫存狀態
        const updateObjs = products.reduce((prev: any[], next: any) => {

          const obj = {
            updateOne: {
              filter: {
                productNo: next.productNo,
                inStockAmount: { $gte: next.qty }
              },
              update: {
                $inc: { inStockAmount: -next.qty },
                $set: {
                  amountStatus: (next.qty === 0 ? "zero" : next.inStockAmount - next.qty) >= next.safeStockAmount ? "safe" : "danger"
                },
              }
            }
          }
          prev.push(obj)
          return prev
        }, [])
        await ProductManagementModel.bulkWrite(updateObjs);
        return handleSuccess(res, "訂單成功建立成功", order);
      } else {
        return next(appError(400, "訂單路由錯誤", next));
      }
    }
  ),
};

export default orders;
