import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import handleSuccess from "../service/handleSuccess";
import appError from "../service/appError";
import TableManagementModel from "../models/tableManagementModel";
import ProductManagementModel from '../models/productManagementModel';
import Order from "../models/orderModel";
import CouponModel from "../models/couponModel"
import OrderDetail from "../models/orderDetailModel";
import Rating from "../models/ratingModel";
import AbCouponModel from "../models/abCouponModel";
import { combinedDateTimeString, period } from "../utils/dayjs"
import { Meta } from "../types/Pagination";

export const calculateTotalPrice = (a: any, b: any, discount: number) => {
  let totalPrice = 0;

  const qtyA = a.reduce((total: number, item: any) => total + item.qty, 0);
  const qtyB = b.reduce((total: number, item: any) => total + item.qty, 0);

  // 判斷哪個陣列的 qty 總數更長，並將其設為 a，另一個陣列設為 b。
  if (qtyA < qtyB) {
    [a, b] = [b, a];
  }

  for (let i = 0; i < a.length; i++) {
    let remainingQty = a[i].qty;

    for (let j = 0; j < b.length && remainingQty > 0; j++) {
      if (b[j].qty === 0) {
        continue;
      }

      const matchedQty = Math.min(remainingQty, b[j].qty);
      const minPrice = Math.min(a[i].price, b[j].price);

      const subtotal = minPrice * matchedQty;
      totalPrice += subtotal;

      remainingQty -= matchedQty;
      b[j].qty -= matchedQty;

      if (remainingQty === 0) {
        break;
      }
    }
  }

  const discountedPrice = Math.ceil(totalPrice * (100 - discount) / 100);
  return discountedPrice;
}

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

      const couponObj: any = await CouponModel.findOne({
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
      let discount = 0
      // 商品內優惠活動 (未計算)

      // 訂單優惠碼
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
      // ab 分類與 折扣
      const productsTypeInAbCoupon = selectedProductTypes.reduce((prev: any, next: any) => {
        prev[next.productsTypeA.productsType] = {
          productsType: next.productsTypeA.productsType,
          productsTypeName: next.productsTypeA.productsTypeName,
          couponNo: next.couponNo,
          couponName: next.couponName,
          discount: next.discount
        }

        prev[next.productsTypeB.productsType] = {
          productsType: next.productsTypeB.productsType,
          productsTypeName: next.productsTypeB.productsTypeName,
          couponNo: next.couponNo,
          couponName: next.couponName,
          discount: next.discount
        }
        return prev
      }, {})
      // 不同 Ａ+Ｂ 可能折扣不同
      /*
        {
          'B000000001' : {
            '1':[ { productNo: 1, price: 100, qty: 10 } ],
            2': [
              { productNo: 4, price: 100, qty: 10 },
              { productNo: 2, price: 50, qty: 10 }
            ]
          }
        }
      */
      const abMinus: any = {}
      const products = tempProducts.reduce((prev: any[], next, index) => {
        const { qty, note } = inputProducts[index]
        const originalPrice = next.price
        // discount 無條件進位
        const tempDiscount = couponObj ? Math.ceil(next.price * (100 - couponObj.discount) / 100) : 0
        // price 無條件捨去
        next.price = couponObj ? Math.floor(next.price * couponObj.discount / 100) : next.price
        const product: any = {
          ...next,
          qty,
          note,
          originalPrice,
          discount: tempDiscount * qty,
          subTotal: next.price * qty
        }
        // 計算要再回扣的Ａ＋Ｂ的錢

        // 使用的 couponName true 則塞入 符合 A ＋ Ｂ
        if (productsTypeInAbCoupon[next.productsType.productsType] !== undefined) {
          const tempItem = productsTypeInAbCoupon[next.productsType.productsType]

          // 符合規則就在商品加上 couponName , 
          product.couponNo = tempItem.couponNo
          product.couponName = tempItem.couponName
          // product.discount = tempItem.discount
          if (abMinus[product.couponNo] === undefined) {
            abMinus[product.couponNo] = {}
          }
          // 整理出要 abCoupon
          if (abMinus[product.couponNo][next.productsType.productsType] === undefined) {
            abMinus[product.couponNo][next.productsType.productsType] = [{
              productNo: next.productNo,
              price: next.price,
              // discount: product.discount,
              qty
            }]
          } else {
            const targetLength = abMinus[product.couponNo][next.productsType.productsType].length
            // 依照大到小排列
            const method = abMinus[product.couponNo][next.productsType.productsType][targetLength - 1].price < next.price ? 'unshift' : 'push'
            abMinus[product.couponNo][next.productsType.productsType][method]({
              productNo: next.productNo,
              price: next.price,
              qty
            })
          }
        }
        discount += tempDiscount * qty
        totalTime += next.productionTime * qty
        totalPrice = Number(totalPrice) + next.price * qty
        prev.push(product)
        return prev
      }, [])
      const result: any = {
        tableName: tableObj?.tableName,
        orderList: products,
        totalTime,
        totalPrice
      }
      // 扣回多的優惠
      // a + b
      // 取出兩個內容以陣列短的因為有符合數量 且排序由高到低 再乘以折扣數
      // 取出要計算的組別
      /*
        abMinus
        {
          B000000001: { '5': [ [Object] ] },
          B000000002: { '2': [ [Object] ], '3': [ [Object], [Object] ] }
        }
      */
      // abCoupon 有值 再扣
      if (Object.values(abMinus).length > 0) {
        const totalAbMinus = Object.keys(abMinus).reduce((prev, next) => {
          const [a, b] = Object.values(abMinus[next]) as [any, any]
          const result = (a && b) && calculateTotalPrice(a, b, a[0].discount)
          return prev + (result || 0)
        }, 0)
        result.discount = (result.discount || 0) + totalAbMinus
        totalPrice = (totalPrice || 0) - totalAbMinus
        result.totalPrice = totalPrice
      }

      if (couponObj !== null) {
        // 改直接寫入 產品的 price 是否有要再多一個 original price 欄位
        // const originalPrice = totalPrice
        // totalPrice = Math.round(totalPrice * (Number(couponObj.discount)) / 100)
        result.couponNo = couponNo
        result.couponName = couponObj.couponName
        result.discount = discount
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
          orderStatus: "未結帳",
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
        // 測試先隔開
        if (process.env.NODE_ENV !== 'test') {
          const { io } = req.app.settings;
          io.emit("chef", order);
        }

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
        //date?: string;
        createdAt?: { $gte: Date, $lt: Date };
      }
      const { orderStatus, page, createdAt } = req.query as {
        orderStatus?: string;
        date?: string;
        page?: string;
        createdAt?: string;
      };
      const perPage = 10; // 每頁回傳的筆數
      const query: Query = { isDeleted: false };

      if (orderStatus !== undefined && orderStatus !== '') {
        query.orderStatus = orderStatus;
      }

      if (createdAt !== undefined && createdAt !== '') {
        const startDate = new Date(createdAt);
        const endDate = new Date(createdAt);
        endDate.setDate(endDate.getDate() + 1);
        query.createdAt = { $gte: startDate, $lt: endDate };
      }

      try {
        const ordersCount = await Order.find(query).countDocuments();
        const totalPages = Math.ceil(ordersCount / perPage); // 總頁數
        const currentPage = Math.min(parseInt(page ?? '1'), totalPages); // 解析頁碼參數，並限制在合理範圍內
        const skipCount = (currentPage - 1) * perPage; // 要跳過的筆數
        const orders = await Order.find(query)
          .sort({ createdAt: -1 })
          .skip(skipCount)
          .limit(perPage);

        if (orders.length === 0) {
          // 若沒有符合條件的訂單，回傳訊息即可
          return handleSuccess(res, "查詢訂單成功", {
            ordersList: [],
            meta: null,
          });
        }

        const ordersList = orders.map((order) => {
          const { _id, orderNo, tableNo, tableName, createdAt, isDisabled, orderStatus, payment } = order;
          //const transferDate = slashDate(createdAt);
          return {
            _id,
            orderNo,
            tableNo,
            tableName,
            time: period(),
            //createdAt: transferDate,
            createdAt,
            isDisabled,
            orderStatus,
            payment
            //description
          };
        });

        const meta: Meta = {
          pagination: {
            total: ordersCount,
            perPage: perPage,
            currentPage: currentPage,
            lastPage: totalPages,
            nextPage: currentPage < totalPages ? currentPage + 1 : null,
            prevPage: currentPage > 1 ? currentPage - 1 : null,
            from: skipCount + 1,
            to: Math.min(skipCount + ordersList.length, ordersCount),
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
        //const order = await Order.findById(orderId).populate("orderDetail");
        const order = await Order.findById(orderId)
          .populate("orderDetail")
          .populate({
            path: "rating",
            model: "Rating",
            select: "satisfaction description",
          })
          .exec();
        // 檢查訂單是否存在
        if (!order) {
          return next(appError(400, "訂單不存在", next));
        }

        // 取得訂單詳細內容
        const orderDetail = order.orderDetail as any;
        let rating = orderDetail.rating as any;
        if (order.rating) {
          rating = await Rating.findById(order.rating);
        }

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
            //note: item.productNo,
            note: item.note || '',
          })),
          totalTime: orderDetail.totalTime,
          discount: orderDetail.discount,
          totalPrice: orderDetail.totalPrice,
          status: orderDetail.status,
          createdAt: orderDetail.createdAt,
          revisedAt: orderDetail.revisedAt,
          isDeleted: orderDetail.isDeleted,
          //add coupon
          couponNo: orderDetail.couponNo,
          couponName: orderDetail.couponName,
          //add rating
          satisfaction: rating ? rating.satisfaction : null,
          description: rating ? rating.description : null,
        };

        // 回傳訂單詳細內容
        return handleSuccess(res, "查詢成功", formattedOrderDetail);
      } catch (err) {
        return next(appError(400, "查詢訂單詳細內容失敗", next));
      }
    }
  ),


  //S-3-3 滿意度及建議回饋
  postRating: handleErrorAsync(async (req: Request, res: Response, next: NextFunction) => {
    // Destructure the request body
    const { satisfaction, description, payment } = req.body;
    const { orderId: _id } = req.params;
    // Check if the required fields are present
    if (!satisfaction || !_id) {
      return next(appError(400, "請填寫必要欄位!", next));
    }
    // Check if satisfaction is a valid number between 1 and 10
    if (isNaN(satisfaction) || satisfaction <= 0 || satisfaction > 10) {
      return next(appError(400, "只能輸入1-10之間的數字!", next));
    }
    try {
      //rating 內 order 不可以出現重複的
      // Check if a rating with the same order ID already exists
      const existingRating = await Rating.findOne({ order: _id });

      if (existingRating) {
        return next(appError(400, "不能重複提交評分!", next));
      }

      // Create the rating document
      const rating = await Rating.create({
        satisfaction,
        description,
        order: _id
      });

      let orderStatus;
      if (payment === "現金") {
        orderStatus = "已結帳";
      } else if (payment === "linepay") {
        orderStatus = "未結帳";
      } else {
        return next(appError(400, "未選擇付款類型!", next));
      }

      // Update the corresponding order document with the rating
      const order = await Order.findByIdAndUpdate(_id, {
        payment,
        orderStatus,
        rating: rating._id,
      }
        , { new: true }
      );

      if (!order) {
        return next(appError(400, "無法更新訂單資訊", next));
      }

      const response = {
        status: "OK",
        message: "新增成功！",
        code: "200",
        data: {
          _id,
          satisfaction,
          description,
        },
      };

      return handleSuccess(res, "新增成功！", response);
    } catch (error) {
      return next(appError(400, "提交評分資訊失敗!", next));
    }
  }),

  //S-3-5 查詢現金結帳
  checkCash: handleErrorAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { orderNo } = req.params

    if (!orderNo) {
      return next(appError(400, '訂單號碼不得為空', next));
    }

    // 查詢訂單號碼
    const order = await Order.findOne({
      orderNo,
      isDeleted: false
    })
    if (!order) {
      return next(appError(400, '查無訂單', next));
    }
    console.log(order)
    return handleSuccess(res, `查詢成功，訂單 ${orderNo} 狀態為:${order.orderStatus}。`, order);
  })
};

export default orders;
