import { Schema, Document, model } from "mongoose";
interface IUser extends Document {
  name: string;
  number: string;
  phone: string;
  titleNo: number;
  title: string;
  password: string;
  isDisabled: boolean;
  createdAt: Date;
  revisedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const userSchema = new Schema(
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
      required: [true, "請輸入正確職位代號"],
    },
    title: {
      type: String,
    },
    password: {
      type: String,
      required: [true, "請輸入密碼"],
      minlength: 8,
      select: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    isDisabled: {
      type: Boolean,
      required: [true, "狀態請以布林值形式輸入"],
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

export const User = model<IUser>("User", userSchema);
