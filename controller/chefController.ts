import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import appError from "../service/appError";
import handleSuccess from "../service/handleSuccess";
import Order from "../models/orderModel";
import Chef from "../models/chefModel";

export const chef = {
  // 取得待取餐訂單列表
  getPickUpOrders: handleErrorAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { status } = req.query;

        // 檢查 status 參數是否提供
        if (!status) {
          return next(appError(400, "請提供出餐狀態", next));
        }

        // 檢查 status 參數是否有效
        if (status !== "未出餐" && status !== "已出餐") {
          return next(appError(400, "無效的出餐狀態", next));
        }

        // 根據出餐狀態查詢訂單
        const orders = await Order.find({ status });

        // 準備回傳的資料
        //const responseData = orders.map((order: typeof Order) => ({
        const responseData = orders.map((order: Order) => ({
          orderId: order.orderId,
          orderList: order.orderList,
          totalTime: order.totalTime,
          couponNo: order.couponNo,
          couponName: order.couponName,
          discount: order.discount,
          totalPrice: order.totalPrice,
        }));
        return handleSuccess(res, "成功", responseData);
      } catch (err) {
        return next(appError(400, "查詢訂單失敗", next));
      }
    }
  ),

  // 更新訂單狀態
  updateOrderStatus: handleErrorAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { orderId, status } = req.body;

        const updatedOrder = await Order.findOneAndUpdate(
          { orderId },
          { status },
          { new: true }
        );

        if (!updatedOrder) {
          return next(appError(400, "訂單不存在", next));
        }

        const orderNo = updatedOrder.orderNo;
        const updatedOrderWithTime = {
          ...updatedOrder.toJSON(),
          year: orderNo.slice(0, 4),
          month: orderNo.slice(4, 6),
          day: orderNo.slice(6, 8),
          hour: orderNo.slice(8, 10),
          minute: orderNo.slice(10, 12),
          //status: updatedOrder.status,
          status,
        };

        return handleSuccess(res, "成功", {
          orderId: updatedOrderWithTime.orderNo,
          status: updatedOrderWithTime.status,
        });
      } catch (err) {
        return next(appError(400, "更新訂單狀態失敗", next));
      }
    }
  ),
};

export default chef;
