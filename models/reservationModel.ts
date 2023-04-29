import { Schema, Document, model } from "mongoose";
import { Message } from "../constants/messages";
import { TableManagement } from "../models/tableManagementModel";
interface Reservation extends Document {
  tableInofo: TableManagement;
  // tableNo: number;
  // tableName: string;
  // seatsType: number;
  // seats: number;
  name: string;
  phone: string;
  reservationTime: string;
  reservationDate: Date;
  status: string;
  revisedAt?: Date;
  createdAt: Date;
  isCanceled: boolean;
  canceledAt?: Date;
}

const reservationSchema = new Schema(
  {
    tableInofo: {
      type: Schema.Types.ObjectId,
      ref: "TableManagement",
      required: [true, "請輸入座位代號"],
    },
    // tableNo: {
    //   type: Schema.Types.ObjectId,
    //   ref: "TableManagement",
    //   required: [true, "請設定系統桌號"],
    // },
    // tableName: {
    //   type: Schema.Types.ObjectId,
    //   ref: "TableManagement",
    // },
    // seatsType: {
    //   type: Number,
    //   required: [true, "請設定座位人數代號"],
    // },
    // seats: {
    //   type: Number,
    // },
    name: {
      type: String,
      required: [true, Message.NEED_INPUT_NAME],
    },
    phone: {
      type: String,
      required: [true, Message.NEED_INPUT_PHONE],
    },
    reservationTime: {
      type: String,
      required: [true, Message.NEED_INPUT_RESERVATIONTIME],
    },
    reservationDate: {
      type: String,
      required: [true, Message.NEED_INPUT_RESERVATIONDATE],
    },
    status: {
      type: String,
      required: [true, Message.NEED_INPUT_RESERVATIONDATE],
    },
    revisedAt: {
      type: Date,
      default: null,
      select: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    isCanceled: {
      type: Boolean,
      required: [true, "取消" + Message.NEED_INPUT_STATUS],
    },

    canceledAt: {
      type: Date,
      select: false,
    },
  },
  { versionKey: false, collection: "reservations" }
);
reservationSchema.pre(/^find/, function (next) {
  this.populate({
    path: "tableInofo",
    select: "tableNo tableName tableCode",
  });
  next();
});
export default model<Reservation>("Reservation", reservationSchema);
