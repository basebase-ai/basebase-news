import mongoose from "mongoose";

export interface IUser {
  email: string;
  first: string;
  last: string;
  imageUrl?: string;
  sourceIds: string[];
  isAdmin: boolean;
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
    sourceIds: { type: [String], default: [] },
    isAdmin: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  })
);
