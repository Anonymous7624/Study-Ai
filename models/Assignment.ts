import mongoose, { Schema, Document, Model } from "mongoose";

export type AssignmentStatus = "draft" | "published" | "deleted";
export type DeadlineConfidence = "high" | "medium" | "low";
export type ItemType =
  | "assignment"
  | "quiz"
  | "test"
  | "reading"
  | "project"
  | "study_task"
  | "hidden_deadline"
  | "date_conflict";

export interface IMaterial {
  title?: string;
  link?: string;
  driveFileId?: string;
  contentType?: string;
  extractedText?: string;
}

export interface IAssignment extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  classroomAssignmentId?: string;
  itemType?: ItemType;
  title: string;
  description?: string;
  officialDueDate?: Date;
  inferredDueDate?: Date;
  inferredDueDateConfidence?: DeadlineConfidence;
  dueDateConflict: boolean;
  dueDateConflictReason?: string;
  alternateLink?: string;
  topic?: string;
  status?: AssignmentStatus;
  late?: boolean;
  turnedIn?: boolean;
  localCompleted?: boolean;
  materials?: IMaterial[];
  extractedRequirements?: string[];
  extractedDeadlines?: Array<{ date: Date; source: string; confidence: DeadlineConfidence }>;
  aiSummary?: string;
  teacherIntentSummary?: string;
  firstStep?: string;
  estimatedDifficulty?: number;
  estimatedEffort?: number;
  urgencyScore?: number;
  importanceScore?: number;
  easyScore?: number;
  finalPriorityScore?: number;
  priorityReason?: string;
  relatedClassContext?: string[];
  sourceLinks?: string[];
  // User-facing study notes (generated during sync)
  aiDescription?: string;
  whatYouNeedToDo?: string[];
  helpfulTips?: string[];
  talkingPoints?: string[];
  aiNotes?: string;
  evidenceUsed?: string[];
  dueDateStatus?: "confirmed" | "inferred" | "conflict" | "unknown" | "hidden";
  wrongDateConclusion?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialSchema = new Schema(
  {
    title: String,
    link: String,
    driveFileId: String,
    contentType: String,
    extractedText: String,
  },
  { _id: false }
);

const AssignmentSchema = new Schema<IAssignment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    classroomAssignmentId: String,
    itemType: {
      type: String,
      enum: ["assignment", "quiz", "test", "reading", "project", "study_task", "hidden_deadline", "date_conflict"],
    },
    title: { type: String, required: true },
    description: String,
    officialDueDate: Date,
    inferredDueDate: Date,
    inferredDueDateConfidence: { type: String, enum: ["high", "medium", "low"] },
    dueDateConflict: { type: Boolean, default: false },
    dueDateConflictReason: String,
    alternateLink: String,
    topic: String,
    status: { type: String, enum: ["draft", "published", "deleted"], default: "published" },
    late: { type: Boolean, default: false },
    turnedIn: { type: Boolean, default: false },
    localCompleted: { type: Boolean, default: false },
    materials: [MaterialSchema],
    extractedRequirements: [String],
    extractedDeadlines: [
      {
        date: Date,
        source: String,
        confidence: { type: String, enum: ["high", "medium", "low"] },
      },
    ],
    aiSummary: String,
    teacherIntentSummary: String,
    firstStep: String,
    estimatedDifficulty: Number,
    estimatedEffort: Number,
    urgencyScore: Number,
    importanceScore: Number,
    easyScore: Number,
    finalPriorityScore: Number,
    priorityReason: String,
    relatedClassContext: [String],
    sourceLinks: [String],
    aiDescription: String,
    whatYouNeedToDo: [String],
    helpfulTips: [String],
    talkingPoints: [String],
    aiNotes: String,
    evidenceUsed: [String],
    dueDateStatus: { type: String, enum: ["confirmed", "inferred", "conflict", "unknown", "hidden"] },
    wrongDateConclusion: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AssignmentSchema.index({ userId: 1, classroomAssignmentId: 1 }, { unique: true, sparse: true });
AssignmentSchema.index({ userId: 1, courseId: 1 });
AssignmentSchema.index({ userId: 1, localCompleted: 1, officialDueDate: 1 });

const Assignment: Model<IAssignment> =
  mongoose.models.Assignment ?? mongoose.model<IAssignment>("Assignment", AssignmentSchema);
export default Assignment;
