import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import handleSuccess from "../service/handleSuccess";
import appError from "../service/appError";
import TableManagementModel from "../models/tableManagementModel";
import ProductManagementModel from '../models/productManagementModel';
import Order from "../models/orderModel";
import CouponModel from "../models/couponModel"
import OrderDetail from "../models/orderDetailModel";
import AbCouponModel from "../models/abCouponModel";
import { combinedDateTimeString, period } from "../utils/dayjs"


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
        const product: any = {
          ...next,
          qty,
          note,
          subTotal: next.price * qty
        }
        // 計算要再回扣的Ａ＋Ｂ的錢

        // 使用的 couponName true 則塞入 符合 A ＋ Ｂ
        if (productsTypeInAbCoupon[next.productsType.productsType] !== undefined) {
          const tempItem = productsTypeInAbCoupon[next.productsType.productsType]

          // 符合規則就在商品加上 couponName , 
          product.couponNo = tempItem.couponNo
          product.couponName = tempItem.couponName
          product.discount = tempItem.discount
          if (abMinus[product.couponNo] === undefined) {
            abMinus[product.couponNo] = {}
          }
          // 整理出要 abCoupon
          if (abMinus[product.couponNo][next.productsType.productsType] === undefined) {
            abMinus[product.couponNo][next.productsType.productsType] = [{
              productNo: next.productNo,
              price: next.price,
              discount: product.discount,
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
};

export default orders;
