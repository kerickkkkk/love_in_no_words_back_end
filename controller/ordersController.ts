import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import handleSuccess from "../service/handleSuccess";
import appError from "../service/appError";
import TableManagementModel from "../models/tableManagementModel";
import ProductManagementModel from '../models/productManagementModel';
import Order from "../models/orderModel";
import CouponModel from "../models/couponModel"
import OrderDetail from "../models/orderDetailModel";
import { combinedDateTimeString, period, slashDate } from "../utils/dayjs"
import { Meta } from "../types/Pagination";
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
        note?: string;
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
        const { qty, note } = inputProducts[index]
        const product = {
          ...next,
          qty,
          note,
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
        totalPrice = Math.round(totalPrice * (Number(couponObj.discount)) / 100)
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
        return handleSuccess(res, "建立訂單成功", order);
      } else {
        return next(appError(400, "訂單路由錯誤", next));
      }
    }
  ),
  //S-3-1 訂單查詢
  getOrders: handleErrorAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      interface Query {
        isDeleted: boolean;
        orderStatus?: string;
        date?: string;
      }
      const { orderStatus, date, page } = req.query as {
        orderStatus?: string;
        date?: string;
        page?: string;
      };
      const perPage = 10; // 每頁回傳的筆數
      const query: Query = { isDeleted: false };

      if (orderStatus !== undefined && orderStatus !== '') {
        query.orderStatus = orderStatus;
      }

      if (date !== undefined && date !== '') {
        query.date = date;
      }

      const currentPage = parseInt(page ?? '1'); // 解析頁碼參數，預設為 1
      const skipCount = (currentPage - 1) * perPage; // 要跳過的筆數

      try {
        const totalNum = await Order.countDocuments(query);
        const orders = await Order.find(query).skip(skipCount).limit(perPage);

        if (orders.length === 0) {
          // 若沒有符合條件的訂單，回傳訊息即可
          return handleSuccess(res, "查詢訂單成功", {
            ordersList: [],
            meta: null,
          });
        }

        const ordersList = orders.map((order) => {
          const { _id, orderNo, tableName, createdAt, isDisabled } = order;
          const transferDate = slashDate(createdAt);
          return {
            _id,
            orderNo,
            tableName,
            createdAt: transferDate,
            isDisabled,
          };
        });

        const totalPages = Math.ceil(totalNum / perPage); // 總頁數
        const meta: Meta = {
          pagination: {
            total: ordersList.length,
            perPage: perPage,
            currentPage: currentPage,
            lastPage: totalPages,
            nextPage: currentPage < totalPages ? currentPage + 1 : null,
            prevPage: currentPage > 1 ? currentPage - 1 : null,
            from: skipCount + 1,
            to: skipCount + ordersList.length,
          },
        };

        return handleSuccess(res, "查詢訂單成功", {
          ordersList,
          meta,
        });
      } catch (err) {
        return next(appError(400, "查詢訂單失敗", next));
      }
    }
  ),

  // S-3-2 詳細訂單內容查詢
  getOrderDetail: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      try {
        // 取得 orderId 參數
        const { orderId } = req.params as { orderId?: string };
        // 檢查 orderId 參數是否存在
        if (!orderId) {
          return next(appError(400, "缺少訂單ID", next));
        }

        // 模擬從資料庫取得訂單資訊
        const order = await Order.findById(orderId).populate("orderDetail");

        // 檢查訂單是否存在
        if (!order) {
          return next(appError(400, "訂單不存在", next));
        }

        // 取得訂單詳細內容
        const orderDetail = order.orderDetail as any;

        // 組合訂單詳細內容
        const formattedOrderDetail = {
          _id: orderDetail._id,
          orderNo: orderDetail.orderNo,
          tableNo: orderDetail.tableNo,
          tableName: orderDetail.tableName,
          orderList: orderDetail.orderList.map((item: any) => ({
            _id: item._id,
            productNo: item.productNo,
            productName: item.productName,
            photoUrl: item.photoUrl,
            price: item.price,
            inStockAmount: item.inStockAmount,
            safeStockAmount: item.safeStockAmount,
            amountStatus: item.amountStatus,
            productsType: item.productsType,
            productionTime: item.productionTime,
            description: item.description,
            isDeleted: item.isDeleted,
            qty: item.qty,
            subTotal: item.subTotal,
          })),
          totalTime: orderDetail.totalTime,
          discount: orderDetail.discount,
          totalPrice: orderDetail.totalPrice,
          status: orderDetail.status,
          createdAt: orderDetail.createdAt,
          revisedAt: orderDetail.revisedAt,
          isDeleted: orderDetail.isDeleted,
        };

        // 回傳訂單詳細內容
        return handleSuccess(res, "查詢成功", formattedOrderDetail);
      } catch (err) {
        return next(appError(400, "查詢訂單詳細內容失敗", next));
      }
    }
  ),


  //S-3-3 滿意度及建議回饋
  postRating: handleErrorAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // 解構請求的內容
        const { _id, payment, orderType, satisfaction, description } = req.body;

        // 檢查必填欄位是否存在
        if (!payment || !orderType || !satisfaction) {
          return next(appError(400, "請填寫必要欄位", next));
        }
        // 假設這裡要將評分資訊儲存到資料庫中或進行其他相關操作

        // 假設成功儲存評分資訊，回傳相應的回應
        const response = {
          status: "OK",
          message: "新增成功！",
          code: "200",
          data: {
            _id,
            payment: "現金",
            orderType: orderType,
            satisfaction: satisfaction,
            description: description,
          },
        };

        return handleSuccess(res, "新增成功！", response);
      } catch (err) {
        return next(appError(400, "提交評分資訊失敗", next));
      }
    }
  ),




};

export default orders;
