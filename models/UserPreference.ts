import mongoose, { Schema, Document, Model } from "mongoose";

export type SortMode =
  | "ai-recommended"
  | "due-soonest"
  | "most-important"
  | "easiest-first"
  | "hardest-first"
  | "shortest-first";

export type Theme = "light" | "dark" | "system";

export interface IUserPreference extends Document {
  userId: mongoose.Types.ObjectId;
  defaultSortMode: SortMode;
  theme: Theme;
  modelName: string;
  secondaryModelName?: string;
  localModelBaseUrl: string;
  dashboardLayout?: Record<string, unknown>;
}

const UserPreferenceSchema = new Schema<IUserPreference>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    defaultSortMode: {
      type: String,
      enum: [
        "ai-recommended",
        "due-soonest",
        "most-important",
        "easiest-first",
        "hardest-first",
        "shortest-first",
      ],
      default: "ai-recommended",
    },
    theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
    modelName: { type: String, default: "deepseek-r1:7b" },
    secondaryModelName: { type: String, default: "qwen2.5-coder:7b" },
    localModelBaseUrl: { type: String, default: "http://localhost:11434" },
    dashboardLayout: Schema.Types.Mixed,
  },
  { timestamps: true }
);

const UserPreference: Model<IUserPreference> =
  mongoose.models.UserPreference ??
  mongoose.model<IUserPreference>("UserPreference", UserPreferenceSchema);
export default UserPreference;
