/**
 * Google Drive API integration.
 * Stub for local dev. Implement when connecting Google.
 */

import type { GoogleClassroomConfig } from "./classroom";

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

export async function getFileMetadata(
  fileId: string,
  _config?: GoogleClassroomConfig
): Promise<DriveFileMetadata | null> {
  // TODO: Real Drive API
  return null;
}

export async function downloadFileContent(
  fileId: string,
  mimeType: string,
  _config?: GoogleClassroomConfig
): Promise<Buffer | string | null> {
  // TODO: Export Docs/Slides to plain text, download PDF
  return null;
}

export async function exportGoogleDoc(
  fileId: string,
  _config?: GoogleClassroomConfig
): Promise<string | null> {
  // TODO: Use Drive export or Docs API
  return null;
}

export async function exportGoogleSlides(
  fileId: string,
  _config?: GoogleClassroomConfig
): Promise<string | null> {
  // TODO: Export to plain text where possible
  return null;
}
