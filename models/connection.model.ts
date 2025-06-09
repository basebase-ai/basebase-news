import mongoose, { Document, Types } from "mongoose";

export interface IConnection extends Document {
  firstId: Types.ObjectId; // Always the smaller ObjectId
  secondId: Types.ObjectId; // Always the larger ObjectId
  status: "FIRST_REQUESTED" | "SECOND_REQUESTED" | "CONNECTED" | "DISCONNECTED";
  createdAt: Date;
  updatedAt: Date;
}

const connectionSchema = new mongoose.Schema({
  firstId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  secondId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["FIRST_REQUESTED", "SECOND_REQUESTED", "CONNECTED", "DISCONNECTED"],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})
  .index({ firstId: 1, secondId: 1 }, { unique: true })
  .index({ firstId: 1, status: 1 })
  .index({ secondId: 1, status: 1 });

export const Connection =
  mongoose.models.Connection ||
  mongoose.model<IConnection>("Connection", connectionSchema);
