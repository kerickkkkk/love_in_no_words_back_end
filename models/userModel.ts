import { Schema, Document, model } from "mongoose";
import { Message } from "../constants/messages";
interface IUser extends Document {
  name: string;
  number: string;
  phone: string;
  email?: string;
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
      required: [true, Message.NEED_INPUT_NAME],
    },
    number: {
      type: String,
    },
    email: {
      type: String
    },
    phone: {
      type: String,
      required: [true, Message.NEED_INPUT_PHONE],
    },
    titleNo: {
      type: Number,
      required: [true, Message.NEED_INPUT_TITLENO],
    },
    title: {
      type: String,
    },
    password: {
      type: String,
      required: [true, Message.NEED_INPUT_PASSWORD],
      minlength: 8,
      select: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    isDisabled: {
      type: Boolean,
      required: [true, Message.NEED_INPUT_STATUS],
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
