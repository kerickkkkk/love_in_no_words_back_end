import { Schema, Document, model } from "mongoose";
interface rating extends Document {
  satisfaction: number;
  description: string;
}
const ratingSchema = new Schema(
  {
    satisfaction: {
      type: Number,
      required: [true, "請填寫滿意度"],
      default: 0,
    },
    description: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

export default model<rating>("rating", ratingSchema);
