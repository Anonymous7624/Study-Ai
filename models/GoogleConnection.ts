import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGoogleConnection extends Document {
  userId: mongoose.Types.ObjectId;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  googleEmail?: string;
  scopes: string[];
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GoogleConnectionSchema = new Schema<IGoogleConnection>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    googleEmail: String,
    scopes: { type: [String], default: [] },
    lastSyncAt: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

GoogleConnectionSchema.index({ userId: 1 });

const GoogleConnection: Model<IGoogleConnection> =
  mongoose.models.GoogleConnection ??
  mongoose.model<IGoogleConnection>("GoogleConnection", GoogleConnectionSchema);
export default GoogleConnection;
