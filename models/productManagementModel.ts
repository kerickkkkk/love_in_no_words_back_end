import { Schema, Document, model } from "mongoose";
interface ProductManagement extends Document {
  productNo: number;
  productName: string;
  photo: string;
  price: number;
  inStockAmount: number;
  safeStockAmount: number;
  amountStatus?: string;
  productsType: string;
  productionTime: number;
  description: string;
  createdAt: Date;
  isDisabled: boolean;
  revisedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const productManagementSchema = new Schema(
  {
    productNo: {
      type: Number,
      required: [true, "請設定產品編號"],
    },
    productName: {
      type: String,
      required: [true, "請輸入產品名稱"],
    },
    photo: {
      type: String,
      required: [true, "請輸入圖片位子"],
    },
    price: {
      type: Number,
      required: [true, "請輸入售價"],
    },
    inStockAmount: {
      type: Number,
      required: [true, "請輸入商品庫存量"],
    },
    safeStockAmount: {
      type: Number,
      required: [true, "請輸入商品安全庫存量"],
    },
    amountStatus: {
      type: String,
      enum: ["safe", "danger", "zero"],
      default: "safe"
    },
    productsType: {
      type: Schema.Types.ObjectId,
      ref: "ProductType",
      required: [true, "請輸入商品分類編號"],
    },
    productionTime: {
      type: Number,
      required: [true, "製作時間(分鐘)"],
    },
    description: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    isDisabled: {
      type: Boolean,
      required: [true, "狀態請以布林值形式輸入"],
    },
    revisedAt: {
      type: Date,
      select: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
    deletedAt: {
      type: Date,
      select: false,
    },
  },
  {
    versionKey: false,
    collection: "productManagement"
  }
);

export default model<ProductManagement>("ProductManagement", productManagementSchema);
