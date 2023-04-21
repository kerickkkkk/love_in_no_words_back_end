import { Schema, Document, model } from 'mongoose';
interface IUser extends Document {
  name: string;
  number: string;
  phone: string;
  titleNo: number;
  title: string;
  password: string;
  isDisabled: boolean;
  createAt: Date;
  revisedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, '請輸入您的名字'],
    },
    number: {
      type: String
    },
    phone: {
      type: String,
      required: [true, '請輸入您的手機'],
      unique: true,
    },
    titleNo: {
      type: Number,
      default: 4
    },
    title: {
      type: String,
      default: '會員'
    },
    password: {
      type: String,
      required: [true, '請輸入密碼'],
      minlength: 8,
      select: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      select: false,
    },
    isDisabled: {
      type: Boolean,
      default: true,
      select: false,
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
    }
  },
  { versionKey: false }
);

export const User = model<IUser>('User', userSchema);


