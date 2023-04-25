import { Schema, Document, model } from "mongoose";
// couponNo 隨機五碼 改用 mongo objectId
interface Coupon extends Document {
  serialNo: number;
  couponName: string;
  couponCode: string;
  discount: string;
  stoppedAt?: Date;
  createdAt: Date;
  isDisabled: boolean;
  revisedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const couponSchema = new Schema(
  {
    serialNo: {
      type: Number,
      required: [true, "優惠卷編號必填"],
    },
    couponName: {
      type: String,
      required: [true, "優惠卷名稱必填"],
    },
    couponCode: {
      type: String,
      required: [true, "優惠卷代碼必填"],
    },
    discount: {
      type: Number,
      required: [true, "優惠卷折扣必填"],
    },
    stoppedAt: {
      type: Date,
      default: null
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
  { versionKey: false }
);

export default model<Coupon>("Coupon", couponSchema);
