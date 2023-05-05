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

const bucket = firebaseAdmin.storage().bucket();

export const products = {
  getProducts: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const productsTypeQuery =
        req.query.productsType !== undefined
          ? {
              productsTypeName: new RegExp(req.query.productsType),
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
  uploadProductPhoto: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      if (!req.files.length) {
        return next(appError(400, "尚未上傳檔案", next));
      }
      const file = req.files[0];

      const blob = bucket.file(
        `images/${uuidv4()}.${file.originalname.split(".").pop()}`
      );

      const blobStram = blob.createWriteStream();
      blobStram.on("finish", () => {
        const config: GetSignedUrlConfig = {
          action: "read",
          expires: "12-31-2500",
        };
        blob.getSignedUrl(config, (err: any, fireUrl) => {
          console.log(fireUrl);
        });
      });
      blobStram.on("error", (err) => {
        return next(appError(400, "上傳失敗", next));
      });

      blobStram.end(file.buffer);
      return handleSuccess(res, Message.RESULT_SUCCESS, null);
    }
  ),
  // 座位 可新增
  createProduct: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const {
        productName,
        photo,
        price,
        inStockAmount,
        safeStockAmount,
        amountStatus,
        productsType,
        productionTime,
        description,
        isDisabled,
      } = req.body;

      const productNo = await autoIncrementNumber(
        ProductManagementModel,
        "productNo"
      );
      const productManagementObj = await ProductManagementModel.findOne({
        productNo,
      });
      if (productManagementObj !== null) {
        return next(appError(400, "重複產品編號", next));
      }

      const errorMsgArray: string[] = [];

      const hasSameName = await ProductManagementModel.findOne({
        productName,
        isDeleted: false,
      });

      if (hasSameName) {
        errorMsgArray.push("有相同產品名稱");
      }
      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      const newProduct = await ProductManagementModel.create({
        productNo,
        productName,
        photo,
        price,
        inStockAmount,
        safeStockAmount,
        amountStatus,
        productsType,
        productionTime,
        description: description || "",
        isDisabled,
      });
      return handleSuccess(res, Message.RESULT_SUCCESS, newProduct);
    }
  ),
  patchProduct: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      let { productNo } = req.params;
      console.log(typeof productNo);
      productNo = productNo * 1;
      const {
        productName,
        photo,
        price,
        inStockAmount,
        safeStockAmount,
        amountStatus,
        productsType,
        productionTime,
        description,
        isDisabled,
      } = req.body;
      const errorMsgArray: string[] = [];

      if (typeof isDisabled !== "boolean") {
        errorMsgArray.push("啟用狀態有誤");
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      const updatedProduct = await ProductManagementModel.findOneAndUpdate(
        {
          productNo,
          isDeleted: false,
        },
        {
          productName,
          photo,
          price,
          inStockAmount,
          safeStockAmount,
          amountStatus,
          productsType,
          productionTime,
          description: description || "",
          isDisabled,
        },
        {
          returnDocument: "after",
        }
      );
      if (updatedProduct === null) {
        return next(appError(400, "查無產品", next));
      }
      return handleSuccess(res, "產品修改成功", null);
    }
  ),
  deleteProduct: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { productNo } = req.params;

      const errorMsgArray: string[] = [];

      if (!productNo) {
        errorMsgArray.push("產品編號為空");
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      const productObj = await ProductManagementModel.findOneAndUpdate(
        {
          productNo,
          isDeleted: false,
        },
        {
          isDeleted: true,
        },
        {
          returnDocument: "after",
        }
      );
      if (productObj === null) {
        return next(appError(400, "查無產品", next));
      }

      return handleSuccess(res, "刪除成功", null);
    }
  ),

  getProductType: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const productTypes = await ProductTypeModel.find({
        isDeleted: false,
      }).sort({ productsType: 1 });
      handleSuccess(res, "成功", productTypes);
    }
  ),
  createProductType: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { productsTypeName } = req.body;

      const errorMsgArray: string[] = [];

      if (!productsTypeName) {
        errorMsgArray.push("產品分類名稱不得為空");
      }

      const productTypeObj = await ProductTypeModel.findOne({
        productsTypeName,
        isDeleted: false,
      });

      if (productTypeObj) {
        errorMsgArray.push("產品分類名稱重複");
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }
      const productsTypeIndex = await autoIncrementNumber(
        ProductTypeModel,
        "productsType"
      );

      await ProductTypeModel.create({
        productsType: productsTypeIndex,
        productsTypeName,
      });

      handleSuccess(res, "產品分類設定成功", null);
    }
  ),
  deleteProductType: handleErrorAsync(
    async (req: any, res: Response, next: NextFunction) => {
      const { productsType } = req.params;

      const tableCodeObj = await ProductTypeModel.findOneAndUpdate(
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

      const errorMsgArray: string[] = [];

      if (tableCodeObj === null) {
        errorMsgArray.push("查無產品分類編號");
      }

      // 如果有錯誤訊息有返回400
      if (errorMsgArray.length > 0) {
        return next(appError(400, errorMsgArray.join(";"), next));
      }

      handleSuccess(res, "刪除成功", null);
    }
  ),
};

export default products;
