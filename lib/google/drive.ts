/**
 * Google Drive API integration.
 * Fetches file metadata, downloads content, exports Docs and Slides.
 */

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  size?: string;
}

export async function getFileMetadata(
  fileId: string,
  accessToken: string
): Promise<DriveFileMetadata | null> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink,size`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return {
    id: data.id,
    name: data.name ?? "",
    mimeType: data.mimeType ?? "application/octet-stream",
    webViewLink: data.webViewLink,
    size: data.size,
  };
}

export async function downloadFileContent(
  fileId: string,
  accessToken: string
): Promise<Buffer | null> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}

export async function exportGoogleDoc(
  fileId: string,
  accessToken: string
): Promise<string | null> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) return null;
  return res.text();
}

export async function exportGoogleSlides(
  fileId: string,
  accessToken: string
): Promise<string | null> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) return null;
  return res.text();
}
