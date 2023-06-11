import { Schema, Document, model, Types } from "mongoose";
import Rating from "../models/ratingModel";

interface Order extends Document {
  orderNo: string;
  orderStatus: string;
  time: string;
  tableNo: number;
  tableName: number;
  transactionId?: number;
  createdAt: Date;
  orderDetail?: Types.ObjectId;
  isDisabled: boolean;
  revisedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  //rating
  payment?: string;
  // Reference to the Rating subdocument
  rating?: Rating;
  //add note
  note: string;
}
interface Rating {
  satisfaction?: number; // Make satisfaction field optional
  description?: string; // Make description field optional
}
const ratingSchema = new Schema<Rating>({
  satisfaction: {
    type: Number,
  },
  description: {
    type: String,
  },
});

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
      enum: ["未結帳", "已結帳"]
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
    // Line Pay 交易 ID 需配合 orderNo 使用
    transactionId: {
      type: Number,
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
    payment: {
      type: String,
      //required: [true, "請選擇付款方式"],
    },
    satisfaction: {
      type: Number,
      //required: [true, "請填寫滿意度"],
    },
    description: {
      type: String,
      required: false,
    },
    //add rating
    rating: {
      type: Schema.Types.ObjectId,
      ref: "Rating",
      required: false,
    },
    note: {
      type: String,
      required: false
    }
  },
  {
    versionKey: false,
  }
);

orderSchema.pre<Order>("save", async function (next) {
  if (this.rating && this.rating.satisfaction) {
    this.payment = "現金";
    this.orderStatus = "已結帳";
  }
  next();
});

export default model<Order>("Order", orderSchema);