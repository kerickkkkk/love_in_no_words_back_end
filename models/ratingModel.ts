import { Schema, Document, model } from "mongoose";
interface rating extends Document {
  payment: string,
  orderType: string,
  satisfaction: number,
  description: string,
}
const ratingSchema = new Schema(
  {
    payment: {
      type: String,
      required: [true, "請選擇付款方式"],
    },
    orderType: {
      type: String,
      required: [true, "請選擇訂單狀態"],
    },
    satisfaction: {
      type: Number,
      required: [true, "請填寫滿意度"],
      default: 0
    },
    description: {
      type: String,
      required: false
    }
  }
);

export default model<rating>("rating", ratingSchema);
