import { Schema, Document, model } from "mongoose";
interface Member extends Document {
  name: string;
  number: string;
  phone: string;
  titleNo: number;
  title: string;
  createdAt: Date;
  isDisabled: boolean;
  revisedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const memberSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "請輸入姓名"],
    },
    number: {
      type: String,
    },
    phone: {
      type: String,
      required: [true, "請輸入正確電話格式"],
      unique: true,
    },
    titleNo: {
      type: Number,
      default: 4,
    },
    title: {
      type: String,
      default: "會員",
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

export const Member = model<Member>("Member", memberSchema);
