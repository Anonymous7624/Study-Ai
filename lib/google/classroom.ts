/**
 * Google Classroom API integration.
 * Stub/architecture for local dev. Implement full OAuth + API calls when connecting.
 */

import type { Course, Assignment, Post } from "@/lib/types";

export interface GoogleClassroomConfig {
  accessToken?: string;
  refreshToken?: string;
}

let config: GoogleClassroomConfig = {};

export function setClassroomConfig(c: GoogleClassroomConfig) {
  config = { ...config, ...c };
}

export async function listCourses(): Promise<Course[]> {
  if (!config.accessToken) {
    return [];
  }
  // TODO: Real API call
  // const res = await fetch('https://classroom.googleapis.com/v1/courses', {
  //   headers: { Authorization: `Bearer ${config.accessToken}` }
  // });
  return [];
}

export async function listCoursework(courseId: string): Promise<Assignment[]> {
  if (!config.accessToken) {
    return [];
  }
  // TODO: Real API
  return [];
}

export async function listAnnouncements(courseId: string): Promise<Post[]> {
  if (!config.accessToken) {
    return [];
  }
  return [];
}

export async function listTopics(courseId: string): Promise<{ name: string }[]> {
  if (!config.accessToken) {
    return [];
  }
  return [];
}

export async function getStudentSubmissions(
  courseId: string,
  courseworkId: string
): Promise<unknown[]> {
  if (!config.accessToken) {
    return [];
  }
  return [];
}

export function getConnectionStatus(): "connected" | "disconnected" {
  return config.accessToken ? "connected" : "disconnected";
}
