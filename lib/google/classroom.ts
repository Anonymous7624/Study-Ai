/**
 * Google Classroom API integration.
 * Fetches courses, coursework, announcements, and materials.
 */

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  alternateLink?: string;
  teacherFolder?: { alternateLink?: string };
}

export interface ClassroomCourseWork {
  id: string;
  title: string;
  description?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours: number; minutes: number };
  alternateLink?: string;
  materials?: Array<{
    driveFile?: { driveFile?: { id: string; title?: string; alternateLink?: string } };
    link?: { url?: string; title?: string };
  }>;
  topicId?: string;
}

export interface ClassroomAnnouncement {
  id: string;
  text?: string;
  alternateLink?: string;
  materials?: Array<{
    driveFile?: { driveFile?: { id: string; title?: string } };
    link?: { url?: string; title?: string };
  }>;
}

export async function listCourses(accessToken: string): Promise<ClassroomCourse[]> {
  const res = await fetch(
    "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    if (res.status === 401) throw new Error("Token expired or invalid");
    const err = await res.text();
    throw new Error(`Classroom API error: ${err}`);
  }

  const data = await res.json();
  return (data.courses ?? []).map((c: { id: string; name?: string; section?: string; descriptionHeading?: string; alternateLink?: string; teacherFolder?: { alternateLink?: string } }) => ({
    id: c.id,
    name: c.name ?? "Untitled",
    section: c.section,
    descriptionHeading: c.descriptionHeading,
    alternateLink: c.alternateLink,
    teacherFolder: c.teacherFolder,
  }));
}

export async function listCoursework(
  accessToken: string,
  courseId: string
): Promise<ClassroomCourseWork[]> {
  const res = await fetch(
    `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    if (res.status === 401) throw new Error("Token expired or invalid");
    return [];
  }

  const data = await res.json();
  return (data.courseWork ?? []).map((cw: Record<string, unknown>) => ({
    id: cw.id,
    title: cw.title ?? "Untitled",
    description: cw.description,
    dueDate: (cw as { dueDate?: { year: number; month: number; day: number } }).dueDate,
    dueTime: (cw as { dueTime?: { hours: number; minutes: number } }).dueTime,
    alternateLink: (cw as { alternateLink?: string }).alternateLink,
    materials: (cw as { materials?: unknown[] }).materials,
    topicId: (cw as { topicId?: string }).topicId,
  }));
}

export async function listAnnouncements(
  accessToken: string,
  courseId: string
): Promise<ClassroomAnnouncement[]> {
  const res = await fetch(
    `https://classroom.googleapis.com/v1/courses/${courseId}/announcements`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    if (res.status === 401) throw new Error("Token expired or invalid");
    return [];
  }

  const data = await res.json();
  return (data.announcements ?? []).map((a: Record<string, unknown>) => ({
    id: (a as { id: string }).id,
    text: (a as { text?: string }).text,
    alternateLink: (a as { alternateLink?: string }).alternateLink,
    materials: (a as { materials?: unknown[] }).materials,
  }));
}

export async function listTopics(
  accessToken: string,
  courseId: string
): Promise<{ name: string; topicId?: string }[]> {
  const res = await fetch(
    `https://classroom.googleapis.com/v1/courses/${courseId}/topics`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return (data.topic ?? []).map((t: { name?: string; topicId?: string }) => ({
    name: t.name ?? "",
    topicId: t.topicId,
  }));
}
