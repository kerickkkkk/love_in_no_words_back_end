import { Schema, Document, model } from "mongoose";
interface OrderDetail extends Document {
  orderNo: string;
  tableNo: number;
  tableName: number;
  orderList: any[];
  totalTime: number;
  discount: number;
  totalPrice: number;
  couponNo?: string;
  couponName?: string;
  status: string;
  createdAt: Date;
  revisedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}
const orderDetailSchema = new Schema(
  {
    // 訂單編號(時間戳  年月日時分秒 2023 01 01 01 01 01 )
    orderNo: {
      type: Number,
      required: [true, "請設定訂單編號"],
    },
    tableNo: {
      type: Number,
      required: [true, "請設定系統桌號"],
    },
    tableName: {
      type: Number,
      required: [true, "請設定座位名稱"],
    },
    orderList: {
      type: Array,
    },
    totalTime: {
      type: Number,
      required: [true, "製作時間必填"],
    },
    discount: {
      type: Number,
      required: [true, "折扣必填"],
      default: 0
    },
    totalPrice: {
      type: Number,
      required: [true, "總價必填"],
    },
    couponNo: {
      type: String,
    },
    couponName: {
      type: String,
    },
    status: {
      type: String,
      enum: ["未出餐", "已出餐"],
      default: "未出餐"
    },
    createdAt: {
      type: Date,
      default: Date.now,
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
    collection: "orderDetail"
  }
);

export default model<OrderDetail>("OrderDetail", orderDetailSchema);
