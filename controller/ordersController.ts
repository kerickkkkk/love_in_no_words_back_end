import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import handleSuccess from "../service/handleSuccess";
import appError from "../service/appError";
import TableManagementModel from "../models/tableManagementModel";
import ProductManagementModel from '../models/productManagementModel';
import Order from "../models/orderModel";
import OrderDetail from "../models/orderDetailModel";
import { autoIncrementNumber } from "../utils/modelsExtensions";
import dayjs, { period } from "../utils/dayjs"

export const orders = {
  handleOrder: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const {
        tableName,
        products: inputProducts,
        // time,
        // couponNo
      } = req.body

      if (inputProducts.length <= 0) {
        return next(appError(400, "購物車內無產品，請選購", next));
      }

      // 驗證
      const errorMsgArray: string[] = []
      const tableObj = await TableManagementModel.findOne({
        tableName,
        isDeleted: false
      })
      if (tableObj === null) {
        errorMsgArray.push('查無座位');
      }


      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }
      // 取得 產品
      const productNoList = inputProducts.map((item: {
        productNo: number;
        qty: number;
        description?: string;
      }) => item.productNo)

      const tempProducts = await ProductManagementModel.find({
        productNo: {
          $in: productNoList
        },
        isDeleted: false
      }).populate({
        path: "productsType",
        select: "productsType productsTypeName"
      }).lean()

      if (tempProducts.length <= 0) {
        return next(appError(400, "查無訂單內產品", next));
      }
      const inputProductsObj = inputProducts.reduce((prev: any, next: any) => {
        prev[next.productNo] = next
        return prev
      }, {})

      // 出餐數量大於於庫存量阻擋掉 
      const dangerAmount = tempProducts.filter(item => {
        return item.inStockAmount < inputProductsObj[item.productNo].qty
      }).map(item => item.productName).join(';')

      if (dangerAmount.length > 0) {
        return next(appError(400, `庫存量不足: ${dangerAmount}`, next));
      }

      // 計算產品 總價
      let totalTime = 0
      let totalPrice = 0
      // 產品內優惠活動 (未計算)

      // 訂單優惠碼
      const products = tempProducts.reduce((prev: any[], next, index) => {
        const { qty, description } = inputProducts[index]
        const product = {
          ...next,
          qty,
          description,
          subTotal: next.price * qty
        }
        totalTime += next.productionTime
        totalPrice += next.price * qty
        prev.push(product)
        return prev
      }, [])


      const result = {
        tableName: tableObj?.tableName,
        orderList: products,
        totalTime,
        // couponNo,
        // couponName,
        // discount,
        totalPrice
      }

      if (req.path === "/calculate/total-price") {
        console.log("試算訂單");
        return handleSuccess(res, "成功", result);

      } else if (req.path === "/") {
        console.log('新增訂單，非試算')
        // 判斷 是否訂單內有 數量不足

        // 寫入資料庫
        // 確定方法後再去整個文件改
        const orderNo = await autoIncrementNumber(Order)

        const newOrderDetail = await OrderDetail.create({
          orderList: products,
          totalTime,
          // discount,
          totalPrice,
          status: "未出餐"
        })

        const newOrder = await Order.create({
          orderNo,
          orderStatus: "未啟用",
          time: period(),
          tableNo: tableObj?._id,
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
          path: "tableNo",
          select: "tableNo tableName"
        }).populate({
          path: "orderDetail",
          select: "orderList totalTime discount totalPrice status"
        })

        // 通知廚師 要注意 手機與使用者名稱是否會被看到
        const { io } = req.app.settings;
        io.emit("chef", order);

        // 扣除產品當下的數量 如果不足需標示？

        // inStockAmount - qty

        return handleSuccess(res, "訂單成功建立成功", order);
      } else {
        return next(appError(400, "訂單路由錯誤", next));
      }
    }
  ),
};

export default orders;
