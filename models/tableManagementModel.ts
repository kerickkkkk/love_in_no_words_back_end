import { Schema, Document, model } from "mongoose";
interface TableManagement extends Document {
  tableNo: number;
  tableName: string;
  tableCode?: string;
  seats: number;
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
      type: String,
      required: [true, "請輸入桌號命名"],
    },
    tableCode: {
      type: Schema.Types.ObjectId,
      ref: "TableCode",
    },
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

export default model<TableManagement>("TableManagement", tableManagementSchema);
