import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import appError from "../service/appError";
import dayjs from "../utils/dayjs"
import handleSuccess from "../service/handleSuccess";
import OrderModel from "../models/orderModel";

export const report = {
  // O-5-1 獲取賣出數量資料
  getRevenue: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      // 預設獲取當年度
      const year = req.query.year || dayjs().year()
      const orders = await OrderModel.find({
        orderStatus: "已結帳",
        isDeleted: false,
        createdAt: {
          $gte: new Date(`${year}-01-01T00:00:00.000Z`),
          $lte: new Date(`${year}-12-31T23:59:59.999Z`)
        }
      })
        .populate({
          path: "orderDetail",
          select: "totalPrice"
        }).sort({ createdAt: 1 });

      if (orders === null) {
        return next(appError(400, `查無 ${year} 年度資料`, next));
      }
      const tempData = orders.reduce((prev: any, next: any) => {
        const currentMonth = dayjs(next.createdAt).month() + 1
        if (prev[currentMonth] === undefined) {
          prev[currentMonth] = 0
        }
        prev[currentMonth] += next.orderDetail.totalPrice
        return prev
      }, {})

      const data = Object.entries(tempData)
        .map(item => {
          return {
            monthTotal: item[1],
            month: Number(item[0])
          }
        })
      handleSuccess(res, "成功", data);
    }
  ),
  // O-5-2 獲取賣出數量資料
  getSellQuantity: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      // 預設獲取當年度
      const year = req.query.year || dayjs().year()
      const orders = await OrderModel.find({
        orderStatus: "已結帳",
        isDeleted: false,
        createdAt: {
          $gte: new Date(`${year}-01-01T00:00:00.000Z`),
          $lte: new Date(`${year}-12-31T23:59:59.999Z`)
        }
      })
        .populate({
          path: "orderDetail",
          select: "orderList"
        }).sort({ createdAt: 1 });

      if (orders === null) {
        return next(appError(400, `查無 ${year} 年度資料`, next));
      }
      const tempData = orders.reduce((prev: any, next: any) => {
        next.orderDetail.orderList.forEach((orderItem: any) => {
          if (prev[orderItem.productNo] === undefined) {
            prev[orderItem.productNo] = {
              productNo: orderItem.productNo,
              productName: orderItem.productName,
              amount: 0
            }
          }
          prev[orderItem.productNo].amount += orderItem.qty
        })
        return prev
      }, {})

      const data = Object.values(tempData)

      handleSuccess(res, "成功", data);
    }
  ),
  // O-5-3 獲取訂單數量資料
  getOrderQuantity: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      // 預設獲取當年度
      const year = req.query.year || dayjs().year()
      const orders = await OrderModel.find({
        orderStatus: "已結帳",
        isDeleted: false,
        createdAt: {
          $gte: new Date(`${year}-01-01T00:00:00.000Z`),
          $lte: new Date(`${year}-12-31T23:59:59.999Z`)
        }
      }).sort({ createdAt: 1 });

      if (orders === null) {
        return next(appError(400, `查無 ${year} 年度資料`, next));
      }
      const tempData = orders.reduce((prev: any, next: any) => {
        const currentMonth = dayjs(next.createdAt).month() + 1
        if (prev[currentMonth] === undefined) {
          prev[currentMonth] = 0
        }
        prev[currentMonth] += 1
        return prev
      }, {})

      const data = Object.entries(tempData)
        .map(item => {
          return {
            orderNumber: item[1],
            month: Number(item[0])
          }
        })
      handleSuccess(res, "成功", data);
    }
  ),

};

export default report;
