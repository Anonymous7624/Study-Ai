import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import UserFile from "@/models/UserFile";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const files = await UserFile.find({ userId: session.id })
      .sort({ uploadedAt: -1 })
      .lean();

    return NextResponse.json({
      files: files.map((f) => ({
        id: f._id.toString(),
        originalName: f.originalName,
        mimeType: f.mimeType,
        size: f.size,
        uploadedAt: f.uploadedAt,
        sourceType: f.sourceType,
        processed: !!f.extractedText,
      })),
    });
  } catch (err) {
    console.error("Files list error:", err);
    return NextResponse.json(
      { error: "Failed to load files" },
      { status: 500 }
    );
  }
}
