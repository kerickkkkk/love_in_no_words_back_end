import { Schema, Document, model } from "mongoose";
interface Order extends Document {
  orderNo: number;
  orderStatus: string;
  time: string;
  tableNo: string;
  createdAt: Date;
  isDisabled: boolean;
  revisedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const orderSchema = new Schema(
  {
    orderNo: {
      type: Number,
      required: [true, "請設定訂單編號"],
    },
    orderStatus: {
      type: String,
      required: [true, "請輸入訂單狀態"],
    },
    time: {
      type: String,
      enum: ['上午', '下午'],
      required: [true, "請選擇時段"]
    },
    tableNo: {
      type: Schema.Types.ObjectId,
      ref: "TableManagement",
      required: [true, "請輸入桌號"],
    },
    orderDetail: {
      type: Schema.Types.ObjectId,
      ref: "OrderDetail",
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
  }
);

export default model<Order>("Order", orderSchema);
