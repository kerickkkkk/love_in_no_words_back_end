import { Schema, Document, model } from "mongoose";
interface ProductType extends Document {
  productsType: number;
  productsTypeName: string;
  createdAt: Date;
  isDisabled: boolean;
  revisedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const productTypeSchema = new Schema(
  {
    productsType: {
      type: Number,
      required: [true, "請輸入商品分類編號"],
    },
    productsTypeName: {
      type: String,
      required: [true, "請輸入商品分類名稱"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    isDisabled: {
      type: Boolean,
      required: [true, "狀態請以布林值形式輸入"],
      default: false,
    },
    revisedAt: {
      type: Date,
      default: null,
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
    collection: "productType"
  }
);

export default model<ProductType>("ProductType", productTypeSchema);
