import { Schema, Document, model } from "mongoose";
import { TableCode } from "../models/tableCodeModel";
// 保留座位功能 改成直接寫入 seats 座位人數上限
export interface TableManagement extends Document {
  tableNo: number;
  // tableName: string;
  tableName: number;
  // tableCode?: TableCode;
  seats?: number;
  isWindowSeat: boolean;
  createdAt: Date;
  isDisabled: boolean;
  revisedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const tableManagementSchema = new Schema(
  {
    tableNo: {
      type: Number,
      required: [true, "請設定系統桌號"],
    },
    tableName: {
      type: Number,
      required: [true, "請設定座位名稱"],
    },
    seats: {
      type: Number,
    },
    // tableName: {
    //   type: String,
    //   required: [true, "請輸入桌號命名"],
    // },
    // tableCode: {
    //   type: Schema.Types.ObjectId,
    //   ref: "TableCode",
    // },
    isWindowSeat: {
      type: Boolean,
      default: false,
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
  { versionKey: false, collection: "tableManagement" }
);
// 人數上限直接用 tableName 上限 20
// tableManagementSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: "tableCode",
//     select: "seatsType seats",
//   });
//   next();
// });
export default model<TableManagement>("TableManagement", tableManagementSchema);
