import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import * as Papa from 'papaparse';

interface CSVRow {
  [key: string]: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    const text = await file.text();

    // Parse CSV
    const parseResult = Papa.parse<CSVRow>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    const rows = parseResult.data as CSVRow[];
    const errors: Array<{ row: number; error: string }> = [];
    let rows_added = 0;
    let rows_updated = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for header and 0-indexing

      try {
        const mobile = row.mobile?.trim();
        const studentName = row.student_name?.trim() || row.name?.trim();
        const bu = row.bu?.trim();

        // Validation - only 3 required fields
        if (!mobile || !/^\d{10}$/.test(mobile)) {
          errors.push({ row: rowNum, error: 'mobile must be exactly 10 digits' });
          continue;
        }

        if (!studentName || studentName.length === 0) {
          errors.push({ row: rowNum, error: 'student_name is required' });
          continue;
        }

        if (!bu || bu.length === 0) {
          errors.push({ row: rowNum, error: 'bu is required' });
          continue;
        }

        // Auto-generate user_id
        const userId = uuidv4();

        // region is optional, default to bu value
        const region = row.region?.trim() || '';

        // Upsert by mobile (since mobile is unique)
        const result = await execute(
          `INSERT INTO student_mapping
           (user_id, mobile, student_name, bu, region)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (mobile) DO UPDATE SET
             student_name = $3,
             bu = $4,
             region = CASE WHEN $5 = '' THEN student_mapping.region ELSE $5 END`,
          [userId, mobile, studentName, bu, region]
        );

        if (result > 0) {
          rows_added++;
        }
      } catch (error) {
        errors.push({ row: rowNum, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return NextResponse.json({
      rows_added,
      rows_updated,
      total: rows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in admin mapping:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
