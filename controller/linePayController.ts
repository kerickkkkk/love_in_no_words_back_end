import { Request, Response, NextFunction } from "express";
import axios from "axios";
import dotenv from 'dotenv';
import hmacSHA256 from "crypto-js/hmac-sha256";
import Base64 from "crypto-js/enc-base64";

import handleErrorAsync from "../service/handleErrorAsync";
import handleSuccess from "../service/handleSuccess";
import appError from "../service/appError";
import Order from "../models/orderModel";
import { authToken } from "../middleware/auth";
import { Message } from "../constants/messages";

dotenv.config();

// LinePay 環境變數
const {
  LINEPAY_CHANNEL_ID,
  LINEPAY_RETURN_HOST,
  LINEPAY_SITE,
  LINEPAY_VERSION,
  LINEPAY_RETURN_CONFIRM_URL,
  LINEPAY_RETURN_CANCEL_URL,
  LINEPAY_CHANNEL_SECRET_KEY,
  DEV_FRONT_END_URL,
  PRODUCTION_FRONT_END_URL,
  NODE_ENV,
  FRONT_END_RETURN_SUCCESS,
  FRONT_END_RETURN_CANCEL
} = process.env;

let frontEndUrl: (string | undefined) = NODE_ENV === "dev" ?
  DEV_FRONT_END_URL
  : PRODUCTION_FRONT_END_URL
//資料格式
// {
//   "amount" : 100,
//   "currency" : "TWD",
//   "orderId" : "MKSI_S_20180904_1000001",
//   "packages" : [
//       {
//           "id" : "1",
//           "amount": 100,
//           "products" : [
//               {
//                   "id" : "PEN-B-001",
//                   "imageUrl" : "https://pay-store.line.com/images/pen_brown.jpg",
//                   "quantity" : 2,
//                   "price" : 50
//               }
//           ]
//       }
//   ],
//   "redirectUrls" : {
//       "confirmUrl" : "https://pay-store.line.com/order/payment/authorize",
//       "cancelUrl" : "https://pay-store.line.com/order/payment/cancel"
//   }
// }

const convertOrderFormat = (order: any) => {
  return {
    id: order._id,
    amount: order.subTotal,
    products: [
      {
        id: order._id,
        name: order.productName,
        // 太長 有問題 2101 - Parameter error.
        // imageUrl: order.photoUrl,
        quantity: order.qty,
        price: order.price
      }
    ]
  };
}
const createLinePayBody = (order: any) => {
  const linePayBody = {
    ...order,
    redirectUrls: {
      confirmUrl: `${LINEPAY_RETURN_HOST}/${LINEPAY_RETURN_CONFIRM_URL}`,
      cancelUrl: `${LINEPAY_RETURN_HOST}/${LINEPAY_RETURN_CANCEL_URL}`
    },
  }
  return linePayBody
}

const createSignature = (uri: any, linePayBody: any, nonce: any) => {
  if (LINEPAY_CHANNEL_SECRET_KEY) {
    const linePayTemp = `${LINEPAY_CHANNEL_SECRET_KEY}/${LINEPAY_VERSION}/${uri}${JSON.stringify(linePayBody)}${nonce}`
    const encrypt = hmacSHA256(linePayTemp, LINEPAY_CHANNEL_SECRET_KEY)
    const signature = Base64.stringify(encrypt);
    return signature
  }
}


export const linePay = {
  payment: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const token = req.body._token
      if (!token) {
        return next(appError(400, Message.NO_TOKEN, next));
      }
      const authRes = await authToken(token, next)
      if (!authRes) {
        return false;
      }
      const { orderNo } = req.params
      const { redirectDevUrl = false } = req.query
      if (redirectDevUrl) {
        frontEndUrl = DEV_FRONT_END_URL
      }

      const orderData: any = await Order.findOne({
        orderNo,
        isDeleted: false
      }).populate({
        path: "orderDetail",
        select: "orderList totalPrice "
      })

      if (!orderNo || !orderData) {
        return next(appError(400, "查無訂單 或 無訂單號碼", next));
      }

      const packages = orderData.orderDetail.orderList.map(convertOrderFormat);
      if (LINEPAY_CHANNEL_SECRET_KEY) {
        const order = {
          amount: orderData.orderDetail.totalPrice,
          currency: 'TWD',
          orderId: orderData.orderNo,
          packages
        }
        const linePayBody = createLinePayBody(order)

        const uri = `payments/request`
        const nonce = new Date().getTime();

        const signature = createSignature(uri, linePayBody, nonce)

        const url = `${LINEPAY_SITE}/${LINEPAY_VERSION}/${uri}`
        const headers = {
          'X-LINE-ChannelId': LINEPAY_CHANNEL_ID,
          'Content-Type': 'application/json',
          'X-LINE-Authorization-Nonce': nonce,
          'X-LINE-Authorization': signature,
        };
        const linePayRes = await axios.post(url, linePayBody, { headers })

        // 請求成功...
        if (linePayRes?.data?.returnCode === '0000') {
          res.redirect(linePayRes?.data?.info.paymentUrl.web);
        } else {
          //  data: { returnCode: '1172', returnMessage: 'Existing same orderId.' }
          return next(appError(400, `LinePay異常： ${linePayRes.data.returnCode} - ${linePayRes.data.returnMessage}`, next));
        }
      }

    }
  ),
  confirm: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { transactionId, orderId } = req.query;
      const orderData: any = await Order.findOne({
        orderNo: orderId,
        isDeleted: false
      }).populate({
        path: "orderDetail",
        select: "orderList totalPrice status couponNo couponName"
      })

      if (!orderId || !orderData) {
        return next(appError(400, "查無訂單 或 無訂單號碼", next));
      }
      const packages = orderData.orderDetail.orderList.map(convertOrderFormat);
      const order = {
        amount: orderData.orderDetail.totalPrice,
        currency: 'TWD',
        orderId: orderData.orderNo,
        packages
      }

      // 建立 LINE Pay 請求規定的資料格式
      const uri = `/payments/${transactionId}/confirm`;
      const linePayBody = {
        amount: order.amount,
        currency: 'TWD',
      }
      const nonce = new Date().getTime();
      const signature = createSignature(uri, linePayBody, nonce)
      const headers = {
        'X-LINE-ChannelId': LINEPAY_CHANNEL_ID,
        'Content-Type': 'application/json',
        'X-LINE-Authorization-Nonce': nonce,
        'X-LINE-Authorization': signature,
      };

      // API 位址
      const url = `${LINEPAY_SITE}/${LINEPAY_VERSION}/${uri}`;
      const linePayRes = await axios.post(url, linePayBody, { headers });

      // 請求成功...
      if (linePayRes?.data?.returnCode === '0000') {
        // 更新訂單狀態
        const updatedOrder = await Order.findOneAndUpdate(
          {
            orderNo: orderId,
            isDeleted: false
          },
          {
            orderStatus: '已結帳',
            transactionId
          },
          { new: true }
        );
        if (updatedOrder === null) {
          return next(appError(400, `帳單狀態更新失敗，但付款成功。 訂單號碼 : ${orderId}`, next));
        }
        // 成功導向夾帶 orderNo 再讓前端可以回去撈
        res.redirect(`${frontEndUrl}/${FRONT_END_RETURN_SUCCESS}`)
      } else {
        return next(appError(400, `LinePay異常，錯誤代碼： ${linePayRes.data.returnCode} - ${linePayRes.data.returnMessage}`, next));
      }
    }),
  cancel: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      res.redirect(`${frontEndUrl}/${FRONT_END_RETURN_CANCEL}`)
    }),
  checkPayment: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const token = req.body._token
      if (!token) {
        return next(appError(400, Message.NO_TOKEN, next));
      }
      const authRes = await authToken(token, next)
      if (!authRes) {
        return false;
      }

      const { orderNo } = req.params
      if (!orderNo) {
        return next(appError(400, "無訂單編號", next));
      }

      const hasTransactionId = await Order.findOne({
        orderNo,
        isDeleted: false
      })
      if (hasTransactionId === null) {
        return next(appError(400, "查無訂單編號", next));
      }

      const uri = `payments`

      // HTTP Method : GET
      const nonce = new Date().getTime();
      if (LINEPAY_CHANNEL_SECRET_KEY) {
        const linePayTemp = `${LINEPAY_CHANNEL_SECRET_KEY}/${LINEPAY_VERSION}/${uri}orderId=${orderNo}${nonce}`
        const encrypt = hmacSHA256(linePayTemp, LINEPAY_CHANNEL_SECRET_KEY)
        const signature = Base64.stringify(encrypt);

        const headers = {
          'Content-Type': 'application/json',
          'X-LINE-ChannelId': LINEPAY_CHANNEL_ID,
          'X-LINE-Authorization-Nonce': nonce,
          'X-LINE-Authorization': signature,
        };
        const url = `${LINEPAY_SITE}/${LINEPAY_VERSION}/${uri}?orderId=${orderNo}`;
        const linePayRes: any = await axios.get(url, { headers })
        if (linePayRes?.data?.returnCode === '0000') {
          const map: any = {
            CAPTURE: '已請款',
            AUTHORIZATION: '授權',
            VOIDED_AUTHORIZATION: '授權無效（在呼叫"Void API"的狀態）',
            EXPIRED_AUTHORIZATION: '授權到期（LINE Pay所允許的商家授權有效期已過期）',
          }
          // 把訂單拉出來直接給狀態
          handleSuccess(res, `查詢成功，訂單 ${orderNo} 狀態為: ${map[linePayRes.data.info[0].payStatus]}`, null)
        } else {
          return next(appError(400, `LinePay異常，錯誤代碼： ${linePayRes.data.returnCode} - ${linePayRes.data.returnMessage}`, next));
        }
      }
    }),
};

export default linePay;
