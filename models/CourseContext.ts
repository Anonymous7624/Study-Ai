import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICourseContext extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  activeUnit?: string;
  recentTopics?: string[];
  importantTerms?: string[];
  importantMaterials?: string[];
  likelyTeacherRules?: string[];
  aiClassSummary?: string;
  updatedAt: Date;
}

const CourseContextSchema = new Schema<ICourseContext>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    activeUnit: String,
    recentTopics: [String],
    importantTerms: [String],
    importantMaterials: [String],
    likelyTeacherRules: [String],
    aiClassSummary: String,
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CourseContextSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const CourseContext: Model<ICourseContext> =
  mongoose.models.CourseContext ??
  mongoose.model<ICourseContext>("CourseContext", CourseContextSchema);
export default CourseContext;
