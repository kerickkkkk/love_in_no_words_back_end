import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import appError from "../service/appError";
import handleSuccess from "../service/handleSuccess";
import Order from "../models/orderModel";
import orderDetail from "../models/orderDetailModel";
import { combinedDateTimeString, period } from "../utils/dayjs";
import dayjs from 'dayjs';
import Chef from "../models/chefModel";

const chefController = {
  //C-1-1 訂單內容查詢
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
        const orderDetails = await orderDetail.find({ status, isDeleted: false });

        // 準備回傳的資料
        const responseData = orderDetails.map((orderDetail: any) => {
          const orderNo = orderDetail.orderNo;
          //const formattedDateTime = dayjs(orderNo).format("YYYYMMDDHHmmss");
          return {
            orderNo,
            status: orderDetail.status,
            orderList: orderDetail.orderList.map((item: any) => {
              return {
                productNo: item.productNo,
                productName: item.productName,
                qty: item.qty,
                productionTime: item.productionTime,
                productsType: item.productsType,
                productsTypeName: item.productsTypeName,
                description: item.description,
                couponNo: item.couponNo,
                couponName: item.couponName,
                note: item.productNo,
              };
            }),
            totalTime: orderDetail.totalTime,
            couponNo: orderDetail.couponNo,
            couponName: orderDetail.couponName,
            discount: orderDetail.discount,
            totalPrice: orderDetail.totalPrice,
          };
        });
        return handleSuccess(res, "查詢成功！", responseData);
      } catch (err) {
        return next(appError(400, "查詢訂單失敗", next));
      }
    }
  ),

  // C-1-2 訂單出餐
  // 更新訂單狀態
  updateOrderStatus: handleErrorAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { orderNo: _id } = req.params;
        if (!_id) {
          return next(appError(400, "缺少訂單ID", next));
        }
        const { status } = req.body;

        // 檢查 status 參數是否有效
        const validStatuses = ["未出餐", "已出餐"]; // 定義有效的出餐狀態列表
        if (status && !validStatuses.includes(status)) {
          return next(appError(400, "無效的出餐狀態", next));
        }

        const updatedOrder = await orderDetail.findOneAndUpdate(
          { orderNo: _id },
          { status },
          { new: true }
        );

        if (!updatedOrder) {
          return next(appError(400, "找不到指定的訂單", next));
        }

        const responseData = {
          orderId: updatedOrder.orderNo,
          status: updatedOrder.status
        };
        return handleSuccess(res, "更新成功！", responseData);
      } catch (err) {
        return next(appError(400, "更新訂單狀態失敗！", next));
      }
    }
  )

};

export default chefController;