import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import appError from "../service/appError";
import dayjs from "../utils/dayjs"
import handleSuccess from "../service/handleSuccess";
import OrderModel from "../models/orderModel";
import validator from "validator";
import { Meta } from "../types/Pagination"

interface RequestQuery {
  year?: number;
  month?: number;
  number?: number;
  page?: number;
}


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

  // O-5-5 條件搜尋訂單資訊 
  getOrderInformation: handleErrorAsync(
    async (req: Request<any, any, any, RequestQuery>, res: Response, next: NextFunction) => {

      const { query } = req;
      const year = Number(query.year) || dayjs().year();
      const month = Number(query.month) || dayjs().month() + 1;
      const perPage = Number(query.number) || 50;
      const currentPage = Number(query.page) || 1;

      // 使用 dayjs 建立起始日期和結束日期物件
      const startOfMonth = dayjs(`${year}-${month}-01`).toDate(); // 設定月初日期
      const endOfMonth = dayjs(`${year}-${month}-01`).endOf('month').toDate(); // 設定月底日期
      // isInt 第一個參數要字串
      if (!validator.isInt(perPage?.toString(), { min: 1 })) {
        return next(appError(400, "單頁筆數請以正整數輸入", next));
      }

      if (!dayjs(startOfMonth).isValid() || !dayjs(endOfMonth).isValid()) {
        return next(appError(400, "日期格式錯誤", next));
      }

      if (!validator.isInt(month?.toString(), { min: 1, max: 12 })) {
        return next(appError(400, "月份請輸入 1 ~ 12 月", next));
      }

      const skip = (currentPage - 1) * perPage;

      const [total, orders] = await Promise.all([
        OrderModel.countDocuments({
          orderStatus: "已結帳",
          isDeleted: false,
          createdAt: {
            $gte: startOfMonth,
            $lte: endOfMonth
          }
        }),
        OrderModel.aggregate([
          {
            $match: {
              orderStatus: "已結帳",
              isDeleted: false,
              createdAt: {
                $gte: startOfMonth,
                $lte: endOfMonth
              }
            }
          },
          {
            $skip: skip
          },
          {
            $limit: perPage
          },
          {
            $lookup: {
              from: "orderDetail",
              localField: "orderDetail",
              foreignField: "_id",
              as: "orderDetail"
            }
          },
          {
            $unwind: "$orderDetail"
          },
          {
            $addFields: {
              createdAtFormatted: {
                $dateToString: {
                  format: "%Y-%m-%d %H:%M:%S",
                  date: "$createdAt"
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              orderNo: 1,
              createdAt: "$createdAtFormatted",
              totalPrice: "$orderDetail.totalPrice",
            }
          },
          {
            $sort: { createdAt: 1 }
          }
        ])
      ]);

      if (total > 0) {
        const lastPage = Math.ceil(total / perPage);
        const nextPage = currentPage == lastPage ? null : currentPage + 1;
        const prevPage = currentPage == 1 ? null : currentPage - 1;
        const from = (currentPage - 1) * 10 + 1;
        const to = currentPage * perPage > total
          ? total
          : currentPage * perPage;


        if (lastPage < currentPage) {
          return next(appError(400, "超出分頁上限", next));
        }

        const meta: Meta = {
          pagination: {
            total,
            perPage,
            currentPage,
            lastPage,
            nextPage,
            prevPage,
            from,
            to,
          }
        }
        return handleSuccess(res, "成功", {
          data: orders,
          meta
        });
      } else {
        return next(appError(400, "無該月份資料", next));
      }
    }
  ),

};

export default report;
