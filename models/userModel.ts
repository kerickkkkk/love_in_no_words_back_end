import { Schema, Document, model } from 'mongoose';
interface IUser extends Document {
  name: string;
  phone: string;
  email ?: string;
  photo ?: string;
  sex : 'male'|'female';
  password:string;
}

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, '請輸入您的名字'],
    },
    phone: {
      type: String,
      required: [true, '請輸入您的手機'],
      unique: true,
    },
    email: {
      type: String,
    },
    photo: {
      type: String,
      default: '',
    },
    sex: {
      type: String,
      enum: ['male', 'female'],
    },
    password: {
      type: String,
      required: [true, '請輸入密碼'],
      minlength: 8,
      select: false,
    },
    createAt: {
      type: Date,
      default: Date.now,
      select: false
    }
  },
  { versionKey: false }
);

export const User = model<IUser>('User', userSchema);


