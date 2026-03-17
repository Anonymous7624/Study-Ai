import mongoose, { Schema, Document, Model } from "mongoose";

export type CheckJobStatus = "pending" | "running" | "completed" | "failed";

export interface ICheckJob extends Document {
  userId: mongoose.Types.ObjectId;
  status: CheckJobStatus;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  progress?: string;
  progressStage?: number; // 0-7 for progress bar
  coursesProcessed?: number;
  assignmentsProcessed?: number;
  filesProcessed?: number;
  // Sync completion summary
  documentsRead?: number;
  assignmentsFound?: number;
  pastDueCount?: number;
  futureDueCount?: number;
  testsQuizzesCount?: number;
  hiddenDeadlinesCount?: number;
  dateConflictsCount?: number;
  aiMemoryUpdated?: boolean;
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
    progressStage: Number,
    documentsRead: Number,
    assignmentsFound: Number,
    pastDueCount: Number,
    futureDueCount: Number,
    testsQuizzesCount: Number,
    hiddenDeadlinesCount: Number,
    dateConflictsCount: Number,
    aiMemoryUpdated: Boolean,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CheckJobSchema.index({ userId: 1, startedAt: -1 });

const CheckJob: Model<ICheckJob> =
  mongoose.models.CheckJob ?? mongoose.model<ICheckJob>("CheckJob", CheckJobSchema);
export default CheckJob;
