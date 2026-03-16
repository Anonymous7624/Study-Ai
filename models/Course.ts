import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICourse extends Document {
  userId: mongoose.Types.ObjectId;
  classroomCourseId?: string;
  name: string;
  section?: string;
  teacherName?: string;
  room?: string;
  alternateLink?: string;
  teacherPatterns?: string[];
  currentUnitSummary?: string;
  lastSyncedAt?: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    classroomCourseId: String,
    name: { type: String, required: true },
    section: String,
    teacherName: String,
    room: String,
    alternateLink: String,
    teacherPatterns: [String],
    currentUnitSummary: String,
    lastSyncedAt: Date,
  },
  { timestamps: true }
);

CourseSchema.index({ userId: 1, classroomCourseId: 1 }, { unique: true, sparse: true });

const Course: Model<ICourse> =
  mongoose.models.Course ?? mongoose.model<ICourse>("Course", CourseSchema);
export default Course;
