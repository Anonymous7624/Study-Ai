/**
 * Google Classroom + Drive sync service.
 * Orchestrates fetching courses, coursework, announcements, and Drive materials.
 */

import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import Assignment from "@/models/Assignment";
import Post from "@/models/Post";
import UserFile from "@/models/UserFile";
import GoogleConnection from "@/models/GoogleConnection";
import { refreshAccessToken } from "./auth";
import {
  listCourses,
  listCoursework,
  listAnnouncements,
  type ClassroomCourse,
  type ClassroomCourseWork,
  type ClassroomAnnouncement,
} from "./classroom";
import { getFileMetadata, downloadFileContent, exportGoogleDoc } from "./drive";
import mongoose from "mongoose";

export async function syncGoogleData(userId: string): Promise<{
  success: boolean;
  error?: string;
  courses?: number;
  assignments?: number;
}> {
  await connectDB();

  const conn = await GoogleConnection.findOne({ userId }).lean();
  if (!conn) {
    return { success: false, error: "Google not connected" };
  }

  let accessToken = conn.accessToken;
  if (new Date(conn.expiresAt) <= new Date()) {
    const refreshed = await refreshAccessToken(conn.refreshToken);
    accessToken = refreshed.access_token;
    await GoogleConnection.updateOne(
      { userId },
      {
        $set: {
          accessToken: refreshed.access_token,
          expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        },
      }
    );
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  let coursesCount = 0;
  let assignmentsCount = 0;

  try {
    const classroomCourses = await listCourses(accessToken);

    for (const gc of classroomCourses) {
      const course = await Course.findOneAndUpdate(
        { userId: userObjectId, classroomCourseId: gc.id },
        {
          userId: userObjectId,
          classroomCourseId: gc.id,
          name: gc.name,
          section: gc.section,
          alternateLink: gc.alternateLink,
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true }
      );
      coursesCount++;

      const coursework = await listCoursework(accessToken, gc.id);
      for (const cw of coursework) {
        const dueDate = cw.dueDate
          ? new Date(cw.dueDate.year, cw.dueDate.month - 1, cw.dueDate.day)
          : undefined;

        await Assignment.findOneAndUpdate(
          {
            userId: userObjectId,
            courseId: course._id,
            classroomAssignmentId: cw.id,
          },
          {
            userId: userObjectId,
            courseId: course._id,
            classroomAssignmentId: cw.id,
            title: cw.title,
            description: cw.description,
            officialDueDate: dueDate,
            alternateLink: cw.alternateLink,
            status: "published",
          },
          { upsert: true }
        );
        assignmentsCount++;
      }

      const announcements = await listAnnouncements(accessToken, gc.id);
      for (const ann of announcements) {
        await Post.findOneAndUpdate(
          {
            userId: userObjectId,
            courseId: course._id,
            classroomPostId: ann.id,
          },
          {
            userId: userObjectId,
            courseId: course._id,
            classroomPostId: ann.id,
            type: "announcement",
            text: ann.text,
            alternateLink: ann.alternateLink,
          },
          { upsert: true }
        );
      }
    }

    await GoogleConnection.updateOne(
      { userId: userObjectId },
      { $set: { lastSyncAt: new Date() } }
    );

    return {
      success: true,
      courses: coursesCount,
      assignments: assignmentsCount,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    return { success: false, error: msg };
  }
}
