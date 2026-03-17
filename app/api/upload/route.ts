import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import UserFile from "@/models/UserFile";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "image/png",
  "image/jpeg",
  "image/webp",
];

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 20MB limit" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "File type not allowed. Supported: PDF, TXT, DOCX, PNG, JPEG, WebP",
        },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name) || getExtFromMime(file.type);
    const storedName = `${randomBytes(16).toString("hex")}${ext}`;
    const userDir = path.join(UPLOADS_DIR, session.id);

    await mkdir(userDir, { recursive: true });
    const storagePath = path.join(userDir, storedName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(storagePath, buffer);

    await connectDB();

    const userFile = await UserFile.create({
      userId: session.id,
      originalName: file.name,
      storedName,
      mimeType: file.type,
      size: file.size,
      storagePath: path.relative(process.cwd(), storagePath),
      sourceType: "manual_upload",
      extractedText: file.type === "text/plain" ? buffer.toString("utf-8") : undefined,
    });

    return NextResponse.json({
      success: true,
      file: {
        id: userFile._id.toString(),
        originalName: userFile.originalName,
        mimeType: userFile.mimeType,
        size: userFile.size,
        uploadedAt: userFile.uploadedAt,
        sourceType: userFile.sourceType,
      },
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}

function getExtFromMime(mime: string): string {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
  };
  return map[mime] ?? "";
}
