import { Schema, Document, model } from "mongoose";
interface TableCode extends Document {
  seatsType: number;
  seats: number;
  isWindowSeat: boolean;
  createdAt: Date;
  isDisabled: boolean;
  revisedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const tableCodeSchema = new Schema(
  {
    seatsType: {
      type: Number,
      required: [true, "請輸入座位人數代號"],
    },
    seats: {
      type: Number,
      required: [true, "請輸入座位人數上限"],
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

export default model<TableCode>("TableCode", tableCodeSchema);
