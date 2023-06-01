import { Schema, Document, model, Types } from "mongoose";

interface Rating extends Document {
  satisfaction: number;
  description: string;
  order: Types.ObjectId; // Reference to the Order model
}

const ratingSchema = new Schema(
  {
    satisfaction: {
      type: Number,
      required: [true, "請填寫滿意度"],
    },
    description: {
      type: String,
      required: false,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    }
  }
);

export default model<Rating>("Rating", ratingSchema);
