import { Schema, Document, model } from "mongoose";
interface abCoupon extends Document {
  couponNo: string;
  productsTypeA: string;
  productsTypeB: string;
  couponName?: string;
  discount: string;
  createdAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const abCouponSchema = new Schema(
  {
    couponNo: {
      type: String,
      required: [true, "優惠卷編號必填"],
    },
    productsTypeA: {
      type: Schema.Types.ObjectId,
      ref: "ProductType",
      required: [true, "請輸入商品分類編號A"],
    },
    productsTypeB: {
      type: Schema.Types.ObjectId,
      ref: "ProductType",
      required: [true, "請輸入商品分類編號B"],
    },
    couponName: {
      type: String,
      default: "A+B",
    },
    discount: {
      type: Number,
      required: [true, "優惠卷折扣必填"],
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
    collection: "abCoupon"
  }
);

export default model<abCoupon>("AbCoupon", abCouponSchema);
