import { Schema, Document, model } from "mongoose";
import { Message } from "../constants/messages";
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
      required: [true, Message.NEED_INPUT_NAME],
    },
    number: {
      type: String,
    },
    phone: {
      type: String,
      required: [true, Message.NEED_INPUT_PHONE],
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
      required: [true, Message.NEED_INPUT_STATUS],
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
