import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { uploadToS3 } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      );
    }

    const uploadId = uuidv4();
    const timestamp = Date.now();

    // Get file extension
    const ext = file.name.split('.').pop() || 'bin';

    // Create directory path for local storage
    const uploadsDir = path.join(process.cwd(), 'uploads', userId);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Save file locally (for OCR processing)
    const localFilePath = `uploads/${userId}/${timestamp}.${ext}`;
    const fullLocalPath = path.join(process.cwd(), localFilePath);
    fs.writeFileSync(fullLocalPath, buffer);

    // Upload to S3 (optional - skip if credentials not configured)
    let s3Key: string | null = null;
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        s3Key = `scorecards/${userId}/${timestamp}.${ext}`;
        await uploadToS3(s3Key, buffer, file.type || 'application/octet-stream');
      } catch (e) {
        console.warn('S3 upload skipped:', e);
        s3Key = null;
      }
    }

    // Insert into database
    await execute(
      `INSERT INTO scorecard_upload (id, user_id, file_path, s3_key, ocr_status)
       VALUES ($1, $2, $3, $4, $5)`,
      [uploadId, userId, localFilePath, s3Key, 'PENDING']
    );

    return NextResponse.json({
      uploadId,
      status: 'processing',
    });
  } catch (error) {
    console.error('Error in scorecard upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
