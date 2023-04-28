import { Schema, Document, model } from "mongoose";
interface OrderDetail extends Document {
  orderNo: number;
  tableNo: string;
  orderList: Array<any>;
  totalTime: number;
  discount: number;
  totalPrice: number;
  status: string;
  createdAt: Date;
  revisedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}
const orderDetailSchema = new Schema(
  {
    // 等待討論呈現方式
    orderNo: {
      type: Number,
      required: [true, "請設定訂單編號"],
    },
    tableNo: {
      type: Schema.Types.ObjectId,
      ref: "tableManagementModel",
      required: [true, "請輸入桌號"],
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
    },
    totalPrice: {
      type: Number,
      required: [true, "總價必填"],
    },
    status: {
      type: String,
      enum: ['未出餐', '已出餐'],
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
  }
);

export default model<OrderDetail>("OrderDetail", orderDetailSchema);
