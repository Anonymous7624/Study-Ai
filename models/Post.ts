import mongoose, { Schema, Document, Model } from "mongoose";

export type PostType = "announcement" | "assignment" | "material" | "question";

export interface IPost extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  classroomPostId?: string;
  type: PostType;
  text?: string;
  title?: string;
  alternateLink?: string;
  extractedTopics?: string[];
  extractedDates?: Array<{ date: Date; source: string; confidence: string }>;
  aiSummary?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    classroomPostId: String,
    type: { type: String, enum: ["announcement", "assignment", "material", "question"], required: true },
    text: String,
    title: String,
    alternateLink: String,
    extractedTopics: [String],
    extractedDates: [
      {
        date: Date,
        source: String,
        confidence: String,
      },
    ],
    aiSummary: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PostSchema.index({ userId: 1, courseId: 1 });
PostSchema.index({ userId: 1, classroomPostId: 1 }, { unique: true, sparse: true });

const Post: Model<IPost> =
  mongoose.models.Post ?? mongoose.model<IPost>("Post", PostSchema);
export default Post;
