import { Schema, Document, model } from "mongoose";
interface Order extends Document {
  orderNo: string;
  orderStatus: string;
  time: string;
  tableNo: number;
  tableName: number;
  createdAt: Date;
  isDisabled: boolean;
  revisedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const orderSchema = new Schema(
  {
    // 訂單編號(時間戳  年月日時分秒 2023 01 01 01 01 01 )
    orderNo: {
      type: String,
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
      type: Number,
      required: [true, "請設定系統桌號"],
    },
    tableName: {
      type: Number,
      required: [true, "請設定座位名稱"],
    },
    // 經討論直接寫入就不用去撈取
    // tableNo: {
    //   type: Schema.Types.ObjectId,
    //   ref: "TableManagement",
    //   required: [true, "請輸入桌號"],
    // },

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
