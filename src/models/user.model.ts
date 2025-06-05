import mongoose, { Document, Types } from "mongoose";

export interface IUser extends Document {
  email: string;
  first: string;
  last: string;
  imageUrl?: string;
  sourceIds: Types.ObjectId[];
  isAdmin: boolean;
  denseMode: boolean;
  darkMode: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export const User = mongoose.model<IUser>(
  "User",
  new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    first: { type: String, required: true },
    last: { type: String, required: true },
    imageUrl: String,
    sourceIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Source" }],
      default: [],
    },
    isAdmin: { type: Boolean, default: false },
    denseMode: { type: Boolean, default: false },
    darkMode: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  })
);
