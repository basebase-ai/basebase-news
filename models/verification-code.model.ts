import mongoose, { Document, Model, Types } from "mongoose";

export interface IVerificationCode extends Document {
  userId: Types.ObjectId;
  code: string;
  expiresAt: Date;
  createdAt: Date;
}

const verificationCodeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // Auto-delete expired docs
  },
  createdAt: { type: Date, default: Date.now },
});

export const VerificationCode: Model<IVerificationCode> =
  mongoose.models.VerificationCode ||
  mongoose.model<IVerificationCode>("VerificationCode", verificationCodeSchema);
