import { Request, Response, NextFunction } from "express";
import handleErrorAsync from "../service/handleErrorAsync";
import { autoIncrementNumber } from "../utils/modelsExtensions";
import appError from "../service/appError";
import handleSuccess from "../service/handleSuccess";
import ProductManagementModel from "../models/productManagementModel";
import ProductTypeModel from "../models/productTypeModel";
import { isoDate } from "../utils/dayjs";
import { Message } from "../constants/messages";
import { v4 as uuidv4 } from "uuid";
import firebaseAdmin from "../service/firebase";
import { GetSignedUrlConfig } from "@google-cloud/storage";
import https from "https";
import validator from "validator";
import { ProductType } from "../models/productTypeModel";
import { isEffectVal } from "../utils/common";
// 大量製造訂單測試用
import TableManagementModel from "../models/tableManagementModel";
import OrderDetail from "../models/orderDetailModel";
import { combinedDateTimeString, period } from "../utils/dayjs";
import Order from "../models/orderModel";
import { ProductManagement } from "../models/productManagementModel";

export const products = {
  // O-3-1 條件搜尋商品API
  getProducts: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { productsType, priceLowerLimit, priceUpperLimit, amountStatus } =
        req.query;
      const errorMsgArray: string[] = [];
      // productsType驗證是否為數字且能在productsType collection中搜尋到
      let productTypeObj: ProductType | null = null;
      // 若有商品類型則驗證
      if (!(productsType === undefined)) {
        if (Number.isNaN(Number(productsType))) {
          errorMsgArray.push(Message.NEED_POSITIVE_PRODUCT_TYPE);
        } else {
          productTypeObj = await ProductTypeModel.findOne({
            productsType,
            isDeleted: false,
          });
          if (productTypeObj === null) {
            errorMsgArray.push(Message.PRODUCT_TYPE_NOT_FOUND);
          }
        }
      }

      const productsTypeId = productTypeObj?._id;
      // 若有價格區間下限驗證價格區間下限為正整數或0
      if (priceLowerLimit !== undefined) {
        if (!validator.isInt(priceLowerLimit.toString(), { min: 0 })) {
          errorMsgArray.push(Message.NEED_INT_PRICE_LOWERLIMIT);
        }
      }
      // 若有價格區間上限則驗證價格區間上限為正整數
      if (priceUpperLimit !== undefined) {
        if (!validator.isInt(priceUpperLimit.toString(), { gt: 0 })) {
          errorMsgArray.push(Message.NEED_INT_PRICE_UPPERLIMIT);
        }
      }
      // 驗證價格區間上限不可小於價格區間下限
      if (
        priceUpperLimit !== undefined &&
        priceLowerLimit !== undefined &&
        validator.isInt(priceLowerLimit.toString()) &&
        validator.isInt(priceUpperLimit.toString())
      ) {
        if (Number(priceLowerLimit) > Number(priceUpperLimit)) {
          errorMsgArray.push(Message.NEED_PRICE_UPPERLIMIT_LARGER_LOWERLIMIT);
        }
      }
      // 若有狀態則驗證
      if (amountStatus !== undefined) {
        if (
          !(
            amountStatus == "safe" ||
            amountStatus == "danger" ||
            amountStatus == "zero"
          )
        ) {
          errorMsgArray.push(Message.NEED_CORRECT_STATUS);
        }
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }
      // 搜尋條件
      const query: any = {
        isDeleted: false,
      };
      // 若有ref的productsTypeId就加入搜尋條件
      if (productsTypeId !== undefined) {
        query.productsType = productsTypeId;
      }
      const priceRange: any = {};
      // 若有價格區間下限就加入搜尋條件
      if (priceLowerLimit !== undefined) {
        priceRange.$gte = Number(priceLowerLimit);
      }
      // 若有價格區間上限就加入搜尋條件
      if (priceUpperLimit !== undefined) {
        priceRange.$lte = Number(priceUpperLimit);
      }
      if (Object.keys(priceRange).length !== 0) {
        query.price = priceRange;
      }

      // 若有狀態就加入搜尋條件
      if (amountStatus !== undefined) {
        query.amountStatus = amountStatus;
      }

      const products = await ProductManagementModel.find(query).sort({
        productNo: 1,
      });
      const responseData = products.map((product) => ({
        productNo: product?.productNo,
        productName: product?.productName,
        photoUrl: product?.photoUrl,
        price: product?.price,
        inStockAmount: product?.inStockAmount,
        safeStockAmount: product?.safeStockAmount,
        amountStatus: product?.amountStatus,
        productsType: product?.productsType.productsType,
        productsTypeName: product?.productsType.productsTypeName,
        productionTime: product?.productionTime,
        isDisabled: product?.isDisabled,
        description: product?.description,
      }));
      handleSuccess(res, Message.RESULT_SUCCESS, responseData);
    }
  ),
  // O-3-2 上傳商品圖片API
  uploadProductPhoto: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      // 確認request是否有檔案
      if (!req.files.length) {
        return next(appError(400, Message.PHOTO_NONE_UPLOAD, next));
      }
      // 取第一筆檔案
      const file = req.files[0];
      const bucket = firebaseAdmin.storage().bucket();
      // 將檔案名稱以uuid重新命名檔名
      const blob = bucket.file(
        `images/${uuidv4()}.${file.originalname.split(".").pop()}`
      );

      const blobStram = blob.createWriteStream();
      // 檔案寫入完成時的監聽
      blobStram.on("finish", () => {
        // 設定檔案權限以及有效日期
        const config: GetSignedUrlConfig = {
          action: "read",
          expires: "12-31-2500",
        };
        blob.getSignedUrl(config, (err: any, fireUrl) => {
          return handleSuccess(res, Message.RESULT_SUCCESS, {
            photoUrl: fireUrl,
          });
        });
      });
      // 上傳檔案失敗時的監聽
      blobStram.on("error", (err) => {
        return next(appError(400, Message.PHOTP_UPLOAD_FAIL, next));
      });

      blobStram.end(file.buffer);
    }
  ),
  // O-3-3 新增商品API
  createProduct: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const {
        productName,
        photoUrl,
        price,
        inStockAmount,
        safeStockAmount,
        productsType,
        productionTime,
        description,
        isDisabled,
      } = req.body;
      // 先建立新產品的流水號
      const productNo = await autoIncrementNumber(
        ProductManagementModel,
        "productNo"
      );

      const errorMsgArray: string[] = [];

      // 驗證產品名稱是否為空或是已有重複產品名稱
      if (!productName) {
        errorMsgArray.push(Message.NEED_PRODUCT_NAME);
      } else {
        const hasSameName = await ProductManagementModel.findOne({
          productName,
          isDeleted: false,
        });
        if (hasSameName) {
          errorMsgArray.push(Message.SAME_PRODUCT_NAME);
        }
      }

      // 驗證圖片url是專案firebase的url且能否正常開啟
      if (!photoUrl) {
        errorMsgArray.push(Message.NEED_PHOTO_URL);
      } else if (
        !photoUrl.includes(
          "https://storage.googleapis.com/love-in-no-words-back-end.appspot.com/images"
        ) ||
        !(await checkPhotoUrl(photoUrl))
      ) {
        errorMsgArray.push(Message.PHOTOURL_SOURCE_ERROR);
      }

      // 驗證商品價錢為正整數
      if (
        !isEffectVal(price) ||
        !validator.isInt(price?.toString(), { gt: 0 })
      ) {
        errorMsgArray.push(Message.NEED_POSITIVE_PRICE);
      }
      // 驗證商品庫存數量為正整數或0
      if (
        !isEffectVal(inStockAmount) ||
        !validator.isInt(inStockAmount?.toString(), { min: 0 })
      ) {
        errorMsgArray.push(Message.NEED_POSITIVE_STOCKAMOUNT);
      }
      // 驗證安全庫存量為正整數
      if (
        !isEffectVal(safeStockAmount) ||
        !validator.isInt(safeStockAmount?.toString(), { gt: 0 })
      ) {
        errorMsgArray.push(Message.NEED_POSITIVE_SAFE_STOCKAMOUNT);
      }
      // productsType驗證是否為數字且能在productsType collection中搜尋到
      let productTypeObj: ProductType | null = null;
      if (!isEffectVal(productsType) || Number.isNaN(Number(productsType))) {
        errorMsgArray.push(Message.NEED_POSITIVE_PRODUCT_TYPE);
      } else {
        productTypeObj = await ProductTypeModel.findOne({
          productsType,
          isDeleted: false,
        });
        if (productTypeObj === null) {
          errorMsgArray.push(Message.PRODUCT_TYPE_NOT_FOUND);
        }
      }
      // 驗證製作時間為正整數
      if (
        !isEffectVal(productionTime) ||
        !validator.isInt(productionTime?.toString(), { gt: 0 })
      ) {
        errorMsgArray.push(Message.NEED_POSITIVE_PRODUCT_TIME);
      }
      // 驗證啟用、停用為布林值
      if (typeof isDisabled !== "boolean") {
        errorMsgArray.push(Message.NEED_INPUT_STATUS);
      }
      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }
      let amountStatus = "";
      if (inStockAmount == 0) {
        amountStatus = "zero";
      } else if (inStockAmount < safeStockAmount) {
        amountStatus = "danger";
      } else if (inStockAmount > safeStockAmount) {
        amountStatus = "safe";
      }
      // 搭配typescript寫法，不然會報可能為null不能調用_id
      if (productTypeObj === null)
        return next(appError(400, Message.NEED_PRODUCT_NAME, next));
      await ProductManagementModel.create({
        productNo,
        productName,
        photoUrl,
        price,
        inStockAmount,
        safeStockAmount,
        amountStatus,
        productsType: productTypeObj?._id,
        productionTime,
        description: description || "",
        isDisabled,
      });
      return handleSuccess(res, Message.PRODUCT_ADD_SUCCESS, null);
    }
  ),
  // O-3-4 修改商品API
  patchProduct: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { productNo } = req.params;

      const {
        productName,
        photoUrl,
        price,
        inStockAmount,
        safeStockAmount,
        productsType,
        productionTime,
        description,
        isDisabled,
      } = req.body;
      const errorMsgArray: string[] = [];

      // 驗證商品編號須為正整數
      if (!validator.isInt(productNo, { gt: 0 })) {
        return next(appError(400, Message.PRODUCTNO_NOT_FOUND, next));
      } else {
        const findProduct = await ProductManagementModel.findOne({
          productNo,
          isDeleted: false,
        });
        if (findProduct === null) {
          return next(appError(400, Message.PRODUCTNO_NOT_FOUND, next));
        }
      }

      // 驗證產品名稱是否為空或是已有重複產品名稱
      if (!productName) {
        errorMsgArray.push(Message.NEED_PRODUCT_NAME);
      } else {
        const hasSameName = await ProductManagementModel.findOne({
          productName,
          isDeleted: false,
        });
        console.log("hasSameName", hasSameName);
        // 找到相同商品名稱資料的商品編號與現在欲修改的商品編號不同返回錯誤，表示更改後的商品名稱與其他商品名稱衝突
        if (
          isEffectVal(hasSameName) &&
          hasSameName?.productNo != Number(productNo)
        ) {
          errorMsgArray.push(Message.SAME_PRODUCT_NAME);
        }
      }

      // 如果圖片網址不是null、undefined或是空字串時才驗證圖片網址
      if (isEffectVal(photoUrl) && photoUrl?.length !== 0) {
        // 驗證圖片url是專案firebase的url且能否正常開啟
        if (
          !photoUrl.includes(
            "https://storage.googleapis.com/love-in-no-words-back-end.appspot.com/images"
          ) ||
          !(await checkPhotoUrl(photoUrl))
        ) {
          errorMsgArray.push(Message.PHOTOURL_SOURCE_ERROR);
        }
      }

      // 驗證商品價錢為正整數
      if (
        !isEffectVal(price) ||
        !validator.isInt(price.toString(), { gt: 0 })
      ) {
        errorMsgArray.push(Message.NEED_POSITIVE_PRICE);
      }
      // 驗證商品庫存數量為正整數或0
      if (
        !isEffectVal(inStockAmount) ||
        !validator.isInt(inStockAmount.toString(), { min: 0 })
      ) {
        errorMsgArray.push(Message.NEED_POSITIVE_STOCKAMOUNT);
      }
      // 驗證安全庫存量為正整數
      if (
        !isEffectVal(safeStockAmount) ||
        !validator.isInt(safeStockAmount.toString(), { gt: 0 })
      ) {
        errorMsgArray.push(Message.NEED_POSITIVE_SAFE_STOCKAMOUNT);
      }
      // productsType驗證是否為數字且能在productsType collection中搜尋到
      let productTypeObj: ProductType | null = null;
      if (Number.isNaN(Number(productsType))) {
        errorMsgArray.push(Message.NEED_POSITIVE_PRODUCT_TYPE);
      } else {
        productTypeObj = await ProductTypeModel.findOne({
          productsType,
          isDeleted: false,
        });

        if (productTypeObj === null) {
          errorMsgArray.push(Message.PRODUCT_TYPE_NOT_FOUND);
        }
      }
      // 驗證製作時間為正整數
      if (
        !isEffectVal(productionTime) ||
        !validator.isInt(productionTime.toString(), { gt: 0 })
      ) {
        errorMsgArray.push(Message.NEED_POSITIVE_PRODUCT_TIME);
      }
      // 驗證啟用、停用為布林值
      if (typeof isDisabled !== "boolean") {
        errorMsgArray.push(Message.NEED_INPUT_STATUS);
      }
      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }
      let amountStatus = "";
      if (inStockAmount == 0) {
        amountStatus = "zero";
      } else if (inStockAmount < safeStockAmount) {
        amountStatus = "danger";
      } else if (inStockAmount > safeStockAmount) {
        amountStatus = "safe";
      }
      // 搭配typescript寫法，不然會報可能為null不能調用_id
      if (productTypeObj === null)
        return next(appError(400, Message.NEED_PRODUCT_NAME, next));

      await ProductManagementModel.findOneAndUpdate(
        {
          productNo,
          isDeleted: false,
        },
        {
          productName,
          photoUrl,
          price,
          inStockAmount,
          safeStockAmount,
          amountStatus,
          productsType: productTypeObj?._id,
          productionTime,
          description: description || "",
          isDisabled,
        },
        {
          returnDocument: "after",
        }
      );

      return handleSuccess(res, Message.PRODUCT_REVISE_SUCCESS, null);
    }
  ),
  // O-3-5 刪除商品API
  deleteProduct: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { productNo } = req.params;
      // 驗證商品編號須為正整數
      if (!validator.isInt(productNo, { gt: 0 })) {
        return next(appError(400, Message.PRODUCTNO_NOT_FOUND, next));
      } else {
        const findProduct = await ProductManagementModel.findOne({
          productNo,
          isDeleted: false,
        });
        if (findProduct === null) {
          return next(appError(400, Message.PRODUCTNO_NOT_FOUND, next));
        }
      }

      await ProductManagementModel.findOneAndUpdate(
        {
          productNo,
          isDeleted: false,
        },
        {
          isDeleted: true,
          deletedAt: isoDate(),
        },
        {
          returnDocument: "after",
        }
      );

      return handleSuccess(res, Message.PRODUCT_DELETE_SUCCESS, null);
    }
  ),
  // O-3-6 取得商品代碼分類API
  getProductType: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const productTypes = await ProductTypeModel.find({
        isDeleted: false,
      }).sort({ productsType: 1 });
      handleSuccess(res, Message.RESULT_SUCCESS, productTypes);
    }
  ),
  // O-3-7 新增商品分類API
  createProductType: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { productsTypeName } = req.body;

      const errorMsgArray: string[] = [];
      // 確認商品名稱是否輸入
      if (!productsTypeName) {
        errorMsgArray.push(Message.NEED_PRODUCT_TYPE);
      }
      // 確認目前名稱是否重複
      const productTypeObj = await ProductTypeModel.findOne({
        productsTypeName,
        isDeleted: false,
      });

      if (productTypeObj) {
        errorMsgArray.push(Message.SAME_PRODUCT_TYPE);
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      // 取得目前要新增的流水號
      const productsTypeIndex = await autoIncrementNumber(
        ProductTypeModel,
        "productsType"
      );

      await ProductTypeModel.create({
        productsType: productsTypeIndex,
        productsTypeName,
      });

      handleSuccess(res, Message.PRODUCT_TYPE_ADD_SUCCESS, null);
    }
  ),
  // O-3-8 刪除商品分類API
  deleteProductType: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { productsType } = req.params;
      // 如果productsType不是數字就返回錯誤
      if (Number.isNaN(Number(productsType))) {
        return next(appError(400, Message.PRODUCT_TYPE_NOT_FOUND, next));
      }
      const productTypeObj = await ProductTypeModel.findOneAndUpdate(
        {
          productsType,
          isDeleted: false,
        },
        {
          isDeleted: true,
          deletedAt: isoDate(),
        },
        {
          returnDocument: "after",
        }
      );
      // productsType是數字但在db搜尋不到的狀況
      if (productTypeObj === null) {
        return next(appError(400, Message.PRODUCT_TYPE_NOT_FOUND, next));
      }
      handleSuccess(res, Message.DELETE_SUCCESS, null);
    }
  ),
  // 大量製造訂單測試API
  makeManyOrders: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { orderAmount } = req.query;

      const totalTableAmount = await TableManagementModel.countDocuments();
      const totalProductsAmount = await ProductManagementModel.countDocuments();

      for (let orderNo = 0; orderNo < orderAmount; orderNo++) {
        const orderNo = combinedDateTimeString();
        const tableNo = Math.floor(Math.random() * totalTableAmount) + 1;
        const tableObj = await TableManagementModel.findOne({
          tableNo,
        });

        const orderProductsTypeNo =
          Math.floor(Math.random() * totalProductsAmount) + 1;
        const products: any = [];
        // 計算商品 總價
        let totalTime = 0;
        let totalPrice = 0;
        let productType: number[] = [];
        const generateProductNo = (array: number[]) => {
          let randomNumber =
            Math.floor(Math.random() * totalProductsAmount) + 1;
          while (array.includes(randomNumber)) {
            // 如果隨機數已經存在於給定的數組中，就重新生成
            randomNumber = Math.floor(Math.random() * totalProductsAmount) + 1;
          }
          productType.push(randomNumber);
          return randomNumber;
        };
        for (
          let productOrder = 0;
          productOrder < orderProductsTypeNo;
          productOrder++
        ) {
          const qty = Math.floor(Math.random() * 10) + 1;
          // console.log("數字", generateProductNo(productType));
          let productDbInfo: ProductManagement | null = null;
          productDbInfo = await ProductManagementModel.findOne({
            productNo: generateProductNo(productType),
          }).lean();

          if (productDbInfo?.price === undefined) return;
          const product = {
            ...productDbInfo,
            qty,
            subTotal: productDbInfo.price * qty,
          };
          console.log("product", product);
          products.push(product);
          //  orderDetail完成
          totalTime += productDbInfo.productionTime * qty;
          totalPrice += productDbInfo.price * qty;
        }
        const newOrderDetail = await OrderDetail.create({
          orderNo,
          orderList: products,
          tableNo: tableObj?.tableNo,
          tableName: tableObj?.tableName,
          totalTime,
          status: "已出餐",
          discount: 0,
          totalPrice: totalPrice,
        });

        const newOrder = await Order.create({
          orderNo,
          orderStatus: "已結帳",
          time: period(),
          tableNo: tableObj?.tableNo,
          tableName: tableObj?.tableName,
          orderDetail: newOrderDetail._id,
        });
      }

      handleSuccess(res, Message.RESULT_SUCCESS, null);
    }
  ),
  // S-2-1 查詢類別商品API
  getProductsByproductsType: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      // 如果要中文可以改 new RegExp(req.query.productsType)
      const productsTypeQuery =
        req.query.productsType !== undefined
          ? {
              productsType: Number(req.query.productsType),
            }
          : {};
      const productTypeObj = await ProductTypeModel.find(productsTypeQuery);
      const productsTypeAry = productTypeObj.map((item) => item._id);
      const query = {
        productsType: productsTypeAry,
        isDeleted: false,
      };
      const products = await ProductManagementModel.find(query)
        .populate({
          path: "productsType",
          select: "productsType productsTypeName",
        })
        .sort({ productNo: 1 });
      handleSuccess(res, "成功", products);
    }
  ),
};
// 驗證photoUrl是否是後端firebase的圖片來源
async function checkPhotoUrl(url: string) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 200) {
          const contentType = res.headers["content-type"];
          if (contentType === undefined) return resolve(false);
          resolve(contentType.startsWith("image/"));
        } else {
          resolve(false);
        }
      })
      .on("error", (err) => {
        resolve(false);
      });
  });
}

export default products;
