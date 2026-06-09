import { NextResponse } from "next/server";
import { getReadUrl, uploadBufferToS3 } from "@/lib/sponsor-tech/aws-s3";
import { isAwsReady, sponsorEnv } from "@/lib/sponsor-tech/env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isAwsReady()) {
    return NextResponse.json({
      provider: "mock",
      warning: "USE_REAL_AWS=false or AWS credentials are missing; file not uploaded.",
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `studentos-demo/${Date.now()}-${safeName}`;

    const uploaded = await uploadBufferToS3({
      key,
      body: buffer,
      contentType: file.type || "application/octet-stream",
    });

    const readUrl = await getReadUrl(key);

    return NextResponse.json({
      provider: "aws-s3",
      name: file.name,
      mimeType: file.type,
      size: file.size,
      bucket: uploaded.bucket,
      key: uploaded.key,
      region: sponsorEnv.awsRegion,
      readUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        provider: "aws-s3",
        warning: "S3 upload failed; demo can continue with fallback data.",
        error: error instanceof Error ? error.message : "Unknown S3 upload error",
      },
      { status: 200 },
    );
  }
}
