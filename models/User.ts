import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  email: string;
  username: string;
  hashedPassword: string;
  displayName?: string;
  createdAt: Date;
  lastLoginAt?: Date;
  onboardingCompleted: boolean;
  googleConnected: boolean;
  googleEmail?: string;
  lastCheckedAt?: Date;
  preferences?: Record<string, unknown>;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    hashedPassword: { type: String, required: true },
    displayName: String,
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: Date,
    onboardingCompleted: { type: Boolean, default: false },
    googleConnected: { type: Boolean, default: false },
    googleEmail: String,
    lastCheckedAt: Date,
    preferences: Schema.Types.Mixed,
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
export default User;
