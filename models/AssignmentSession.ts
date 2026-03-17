import mongoose, { Schema, Document, Model } from "mongoose";

export type SessionStatus = "active" | "completed" | "skipped";

export interface IChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface IAssignmentSession extends Document {
  userId: mongoose.Types.ObjectId;
  assignmentId: mongoose.Types.ObjectId;
  startedAt: Date;
  endedAt?: Date;
  status: SessionStatus;
  actions?: Array<{ type: string; timestamp: Date }>;
  chatHistory: IChatMessage[];
}

const ChatMessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AssignmentSessionSchema = new Schema<IAssignmentSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignmentId: { type: Schema.Types.ObjectId, ref: "Assignment", required: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    status: { type: String, enum: ["active", "completed", "skipped"], default: "active" },
    actions: [{ type: { type: String }, timestamp: { type: Date, default: Date.now } }],
    chatHistory: [ChatMessageSchema],
  },
  { timestamps: true }
);

AssignmentSessionSchema.index({ userId: 1, assignmentId: 1 });
AssignmentSessionSchema.index({ userId: 1, status: 1 });

const AssignmentSession: Model<IAssignmentSession> =
  mongoose.models.AssignmentSession ??
  mongoose.model<IAssignmentSession>("AssignmentSession", AssignmentSessionSchema);
export default AssignmentSession;
