import mongoose, { Schema, Document, Model } from "mongoose";

export type CheckJobStatus = "pending" | "running" | "completed" | "failed";

export interface SyncSummary {
  documentsReadCount: number;
  assignmentsFoundCount: number;
  pastDueCount: number;
  futureDueCount: number;
  testsAndQuizzesCount: number;
  hiddenDeadlinesFoundCount: number;
  dueDateConflictsFoundCount: number;
  classesProcessedCount: number;
  uploadedFilesProcessedCount: number;
  memoryUpdated: boolean;
  syncedAt: Date;
}

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
  // Extended sync summary
  documentsReadCount?: number;
  assignmentsFoundCount?: number;
  pastDueCount?: number;
  futureDueCount?: number;
  testsAndQuizzesCount?: number;
  hiddenDeadlinesFoundCount?: number;
  dueDateConflictsFoundCount?: number;
  classesProcessedCount?: number;
  uploadedFilesProcessedCount?: number;
  memoryUpdated?: boolean;
  syncedAt?: Date;
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
    documentsReadCount: Number,
    assignmentsFoundCount: Number,
    pastDueCount: Number,
    futureDueCount: Number,
    testsAndQuizzesCount: Number,
    hiddenDeadlinesFoundCount: Number,
    dueDateConflictsFoundCount: Number,
    classesProcessedCount: Number,
    uploadedFilesProcessedCount: Number,
    memoryUpdated: Boolean,
    syncedAt: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CheckJobSchema.index({ userId: 1, startedAt: -1 });

const CheckJob: Model<ICheckJob> =
  mongoose.models.CheckJob ?? mongoose.model<ICheckJob>("CheckJob", CheckJobSchema);
export default CheckJob;
