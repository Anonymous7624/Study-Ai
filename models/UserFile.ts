import mongoose, { Schema, Document, Model } from "mongoose";

export type SourceType = "manual_upload" | "google_drive" | "classroom_attachment";

export interface IUserFile extends Document {
  userId: mongoose.Types.ObjectId;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  sourceType: SourceType;
  extractedText?: string;
  uploadedAt: Date;
  metadata?: Record<string, unknown>;
}

const UserFileSchema = new Schema<IUserFile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storagePath: { type: String, required: true },
    sourceType: {
      type: String,
      enum: ["manual_upload", "google_drive", "classroom_attachment"],
      default: "manual_upload",
    },
    extractedText: String,
    uploadedAt: { type: Date, default: Date.now },
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

UserFileSchema.index({ userId: 1 });
UserFileSchema.index({ userId: 1, uploadedAt: -1 });

const UserFile: Model<IUserFile> =
  mongoose.models.UserFile ?? mongoose.model<IUserFile>("UserFile", UserFileSchema);
export default UserFile;
