import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  username: string;
  hashedPassword: string;
  displayName?: string;
  createdAt: Date;
  lastLoginAt?: Date;
  preferences?: Record<string, unknown>;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    hashedPassword: { type: String, required: true },
    displayName: String,
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: Date,
    preferences: Schema.Types.Mixed,
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
export default User;
