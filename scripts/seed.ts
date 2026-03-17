/**
 * Seed courses, assignments, posts, and course context for local dev.
 * Run: npm run seed
 * Prerequisite: Create an account at /create-account or run seed:user.
 */
import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User";
import Course from "../models/Course";
import Assignment from "../models/Assignment";
import Post from "../models/Post";
import CourseContext from "../models/CourseContext";
import UserPreference from "../models/UserPreference";

async function seed() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/classpilot";
  await mongoose.connect(uri);

  const user = await User.findOne({
    $or: [
      { email: (process.env.SEED_EMAIL || "dev@classpilot.local").toLowerCase() },
      { username: process.env.SEED_USERNAME || "devuser" },
    ],
  });

  if (!user) {
    console.error("No user found. Create an account at /create-account or run: npm run seed:user");
    process.exit(1);
  }

  const userId = user._id;

  await UserPreference.findOneAndUpdate(
    { userId },
    {
      userId,
      defaultSortMode: "ai-recommended",
      theme: "light",
      modelName: "deepseek-r1:7b",
      localModelBaseUrl: "http://localhost:11434",
    },
    { upsert: true }
  );

  const course1 = await Course.findOneAndUpdate(
    { userId, classroomCourseId: "mock-course-1" },
    {
      userId,
      classroomCourseId: "mock-course-1",
      name: "AP Calculus BC",
      section: "Period 3",
      teacherName: "Ms. Rodriguez",
      room: "Room 214",
      alternateLink: "https://classroom.google.com/c/mock1",
      teacherPatterns: ["Often writes due dates in description", "Uses rubrics in attached docs"],
      currentUnitSummary: "Integration techniques – u-substitution and integration by parts",
      lastSyncedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  const course2 = await Course.findOneAndUpdate(
    { userId, classroomCourseId: "mock-course-2" },
    {
      userId,
      classroomCourseId: "mock-course-2",
      name: "World History",
      section: "Period 5",
      teacherName: "Mr. Chen",
      room: "Room 118",
      alternateLink: "https://classroom.google.com/c/mock2",
      teacherPatterns: ["Deadlines often in announcements", "Emphasizes handwritten outlines"],
      currentUnitSummary: "World War I and its aftermath",
      lastSyncedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const friday = new Date(now);
  while (friday.getDay() !== 5) friday.setDate(friday.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const assignments = [
    {
      userId,
      courseId: course1._id,
      classroomAssignmentId: "mock-a1",
      title: "Chapter 8 Integration Problem Set",
      description:
        "Complete problems 1-25. Due by Friday. Show all work. See rubric attached.",
      officialDueDate: friday,
      inferredDueDate: friday,
      dueDateConflict: false,
      alternateLink: "https://classroom.google.com/c/mock1/a/mocka1",
      topic: "Integration",
      status: "published",
      late: false,
      turnedIn: false,
      localCompleted: false,
      materials: [],
      extractedRequirements: ["Complete problems 1-25", "Show all work", "See rubric"],
      extractedDeadlines: [{ date: friday, source: "description", confidence: "high" }],
      aiSummary: "Integration practice covering u-substitution and by-parts.",
      teacherIntentSummary: "Master the techniques from Chapter 8. Work must be shown.",
      firstStep: "Start with problem 1 – it's a warm-up u-sub.",
      estimatedDifficulty: 6,
      estimatedEffort: 90,
      urgencyScore: 0.85,
      importanceScore: 0.9,
      easyScore: 0.4,
      finalPriorityScore: 0.88,
      priorityReason: "High importance for current unit; due Friday.",
    },
    {
      userId,
      courseId: course2._id,
      classroomAssignmentId: "mock-a2",
      title: "WWI Essay Draft",
      description:
        "First draft due next Monday. Final due Thursday. 1500 words minimum.",
      officialDueDate: nextWeek,
      inferredDueDate: nextWeek,
      dueDateConflict: false,
      alternateLink: "https://classroom.google.com/c/mock2/a/mocka2",
      topic: "World War I",
      status: "published",
      late: false,
      turnedIn: false,
      localCompleted: false,
      materials: [],
      extractedRequirements: ["First draft", "1500 words minimum"],
      extractedDeadlines: [
        { date: nextWeek, source: "description", confidence: "high" },
        { date: new Date(nextWeek.getTime() + 3 * 86400000), source: "description", confidence: "high" },
      ],
      aiSummary: "Two-part essay with draft and final deadlines.",
      teacherIntentSummary: "Get feedback on draft before final submission.",
      firstStep: "Outline your thesis and three main arguments.",
      estimatedDifficulty: 7,
      estimatedEffort: 180,
      urgencyScore: 0.75,
      importanceScore: 0.95,
      easyScore: 0.2,
      finalPriorityScore: 0.82,
      priorityReason: "Major assignment with two deadlines. Start draft early.",
    },
    {
      userId,
      courseId: course1._id,
      classroomAssignmentId: "mock-a3",
      title: "Quick Warm-up: Derivatives Review",
      description: "5 problems. Due tomorrow by midnight.",
      officialDueDate: tomorrow,
      inferredDueDate: tomorrow,
      dueDateConflict: false,
      alternateLink: "https://classroom.google.com/c/mock1/a/mocka3",
      topic: "Review",
      status: "published",
      late: false,
      turnedIn: false,
      localCompleted: false,
      materials: [],
      extractedRequirements: ["5 problems"],
      extractedDeadlines: [{ date: tomorrow, source: "description", confidence: "high" }],
      aiSummary: "Short derivative review.",
      teacherIntentSummary: "Quick refresher before moving on.",
      firstStep: "Do problem 1 – simple power rule.",
      estimatedDifficulty: 2,
      estimatedEffort: 15,
      urgencyScore: 0.95,
      importanceScore: 0.5,
      easyScore: 0.9,
      finalPriorityScore: 0.78,
      priorityReason: "Quick win – easy and due soon.",
    },
    {
      userId,
      courseId: course2._id,
      classroomAssignmentId: "mock-a4",
      title: "Read Ch. 12 and Prepare Discussion",
      description:
        "Due Friday. Mr. Chen posted: Actually the discussion is next Tuesday – see announcement.",
      officialDueDate: friday,
      inferredDueDate: new Date(friday.getTime() + 4 * 86400000),
      dueDateConflict: true,
      dueDateConflictReason: "Announcement says discussion moved to Tuesday.",
      alternateLink: "https://classroom.google.com/c/mock2/a/mocka4",
      topic: "WWI",
      status: "published",
      late: false,
      turnedIn: false,
      localCompleted: false,
      materials: [],
      extractedRequirements: ["Read Ch. 12", "Prepare for discussion"],
      extractedDeadlines: [
        { date: friday, source: "description", confidence: "medium" },
        { date: new Date(friday.getTime() + 4 * 86400000), source: "announcement", confidence: "high" },
      ],
      aiSummary: "Reading plus discussion prep. Date conflict: announcement moves to Tuesday.",
      teacherIntentSummary: "Discussion moved per announcement.",
      firstStep: "Read the first half of Ch. 12 tonight.",
      estimatedDifficulty: 4,
      estimatedEffort: 60,
      urgencyScore: 0.6,
      importanceScore: 0.7,
      easyScore: 0.65,
      finalPriorityScore: 0.65,
      priorityReason: "Possible due date conflict – Tuesday per announcement.",
    },
  ];

  for (const a of assignments) {
    await Assignment.findOneAndUpdate(
      { userId: a.userId, classroomAssignmentId: a.classroomAssignmentId },
      a,
      { upsert: true }
    );
  }

  const posts = [
    {
      userId,
      courseId: course1._id,
      classroomPostId: "mock-p1",
      type: "announcement",
      text: "Office hours today 3-4pm. Bring your integration questions!",
      title: "Office Hours",
      alternateLink: "https://classroom.google.com/c/mock1/p/mockp1",
      extractedTopics: [],
      extractedDates: [],
      aiSummary: "Office hours reminder.",
    },
    {
      userId,
      courseId: course2._id,
      classroomPostId: "mock-p2",
      type: "announcement",
      text: "The discussion for Ch. 12 has been moved to next Tuesday. Prepare accordingly.",
      title: "Discussion Date Change",
      alternateLink: "https://classroom.google.com/c/mock2/p/mockp2",
      extractedTopics: ["Ch. 12", "Discussion"],
      extractedDates: [{ date: new Date(friday.getTime() + 4 * 86400000), source: "announcement", confidence: "high" }],
      aiSummary: "Discussion moved to Tuesday.",
    },
  ];

  for (const p of posts) {
    await Post.findOneAndUpdate(
      { userId: p.userId, classroomPostId: p.classroomPostId },
      { ...p, userId: p.userId, courseId: p.courseId },
      { upsert: true }
    );
  }

  for (const course of [course1, course2]) {
    await CourseContext.findOneAndUpdate(
      { userId, courseId: course._id },
      {
        userId,
        courseId: course._id,
        activeUnit: course.currentUnitSummary,
        recentTopics: course.name.includes("Calculus") ? ["Integration", "u-substitution"] : ["WWI", "Treaty of Versailles"],
        importantTerms: course.name.includes("Calculus") ? ["u-substitution", "by parts"] : ["Alliances", "Trench warfare"],
        importantMaterials: [],
        likelyTeacherRules: course.teacherPatterns,
        aiClassSummary: `Current focus: ${course.currentUnitSummary}`,
      },
      { upsert: true }
    );
  }

  console.log("Seed complete: courses, assignments, posts, and context created.");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
