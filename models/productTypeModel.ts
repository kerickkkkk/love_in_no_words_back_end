import { Schema, Document, model } from "mongoose";
export interface ProductType extends Document {
  productsType: number;
  productsTypeName: string;
  createdAt: Date;
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
    collection: "productType",
  }
);

export default model<ProductType>("ProductType", productTypeSchema);
