import { Schema, Document, model } from "mongoose";
interface onePlusOneSchema extends Document {
  couponNo: string;
  productNo: number;
  productName: string;
  couponName?: string;
  createdAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const onePlusOneSchema = new Schema(
  {
    couponNo: {
      type: String,
      required: [true, "優惠卷編號必填"],
    },
    // productNo, productName
    product: {
      type: Schema.Types.ObjectId,
      ref: "ProductManagement",
      required: [true, "請輸入商品ID"],
    },
    couponName: {
      type: String,
      default: "1 + 1",
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
    collection: "onePlusOne"
  }
);

export default model<onePlusOneSchema>("OnePlusOne", onePlusOneSchema);
