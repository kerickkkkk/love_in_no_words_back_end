import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import appError from "../service/appError";
import handleSuccess from "../service/handleSuccess";
import Order from "../models/orderModel";
import orderDetail from "../models/orderDetailModel";
import { combinedDateTimeString, period } from "../utils/dayjs"
import Chef from "../models/chefModel";

export const chef = {
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
        const orderDetails = await orderDetail.find({ status });

        // 準備回傳的資料
        const responseData = orderDetails.map((orderDetail: any) => {
          const orderNo = Number(orderDetail.orderNo); // 將 orderNo 轉為數字
          const year = orderNo.toString().slice(0, 4); // 提取年份
          const month = orderNo.toString().slice(4, 6); // 提取月份
          const day = orderNo.toString().slice(6, 8); // 提取日期
          const hour = orderNo.toString().slice(8, 10); // 提取小時
          const minute = orderNo.toString().slice(10, 12); // 提取分鐘

          return {
            orderNo: `${year}${month}${day}${hour}${minute}`,
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
        const { orderId: _id } = req.params;
        if (!_id) {
          return next(appError(400, "缺少訂單ID", next));
        }
        const { status } = req.body;

        // 檢查 status 參數是否有效
        const validStatuses = ["未出餐", "已出餐"]; // 定義有效的出餐狀態列表
        if (status && !validStatuses.includes(status)) {
          return next(appError(400, "無效的出餐狀態", next));
        }


        const updatedOrder = await Order.findOneAndUpdate(
          { _id: _id },
          { status },
          { new: true }
        );

        if (!updatedOrder) {
          return next(appError(400, "找不到指定的訂單", next));
        }

        const orderNo = combinedDateTimeString();
        const responseData = {
          orderId: orderNo,
          status: status === "已出餐" ? "已出餐" : "未出餐"
        };
        return handleSuccess(res, "更新成功！", responseData);
      } catch (err) {
        return next(appError(400, "更新訂單狀態失敗！", next));
      }
    }
  )

};

export default chef;
function async(arg0: number, arg1: number, req: any, arg3: { prototype: globalThis.Request; }, res: any, Response: { new(body?: BodyInit | null | undefined, init?: ResponseInit | undefined): globalThis.Response; prototype: globalThis.Response; error(): globalThis.Response; redirect(url: string | URL, status?: number | undefined): globalThis.Response; }, next: any, NextFunction: any) {
  throw new Error("Function not implemented.");
}

