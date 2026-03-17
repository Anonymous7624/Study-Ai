import mongoose, { Schema, Document, Model } from "mongoose";

export type CheckJobStatus = "pending" | "running" | "completed" | "failed";

export interface ICheckJob extends Document {
  userId: mongoose.Types.ObjectId;
  status: CheckJobStatus;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  progress?: string;
  coursesProcessed?: number;
  assignmentsProcessed?: number;
  filesProcessed?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CheckJobSchema = new Schema<ICheckJob>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed"],
      default: "pending",
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    error: String,
    progress: String,
    coursesProcessed: Number,
    assignmentsProcessed: Number,
    filesProcessed: Number,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CheckJobSchema.index({ userId: 1, startedAt: -1 });

const CheckJob: Model<ICheckJob> =
  mongoose.models.CheckJob ?? mongoose.model<ICheckJob>("CheckJob", CheckJobSchema);
export default CheckJob;
