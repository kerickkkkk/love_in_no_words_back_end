import { Schema, Document, model } from "mongoose";
import Order from "../models/orderModel";

export interface Chef extends Document {
  orderId: string;
  orderList: IOrderItem[];
  status: string;
  totalTime: string;
  couponNo: string;
  couponName: string;
  discount: string;
  totalPrice: string;
}

export interface IOrderItem {
  productNo: number;
  productName: string;
  qty: number;
  productionTime: number;
  productsType: number;
  productsTypeName: string;
  description: string;
  couponNo: string;
  couponName: string;
}

const chefSchema: Schema = new Schema<Chef>({
  orderId: {
    type: String,
    required: true
  },
  orderList: [
    {
      productNo: { type: Number, required: true },
      productName: { type: String, required: true },
      qty: { type: Number, required: true },
      productionTime: { type: Number, required: true },
      productsType: { type: Number, required: true },
      productsTypeName: { type: String, required: true },
      description: { type: String, required: true },
      couponNo: { type: String, required: true },
      couponName: { type: String, required: true },
    },
  ],
  status: {
    type: String,
    required: true,
    enum: ["未出餐", "已出餐"]
  },
  totalTime: {
    type: String,
    required: true
  },
  couponNo: {
    type: String,
    required: true
  },
  couponName: {
    type: String,
    required: true
  },
  discount: {
    type: String,
    required: true
  },
  totalPrice: {
    type: String,
    required: true
  },
});

export default model<Chef>("Chef", chefSchema);