import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
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
    const errors: string[] = [];
    let added = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for header and 0-indexing

      try {
        const userId = row.user_id?.trim();
        const mobile = row.mobile?.trim();
        const studentName = row.student_name?.trim();
        const bu = row.bu?.trim();
        const region = row.region?.trim();
        const category = row.category?.trim();
        const homeState = row.home_state?.trim();

        // Validation
        if (!userId) {
          errors.push(`Row ${rowNum}: user_id is required`);
          continue;
        }

        if (!mobile || mobile.length !== 10 || !/^\d{10}$/.test(mobile)) {
          errors.push(`Row ${rowNum}: mobile must be exactly 10 digits`);
          continue;
        }

        if (!bu || bu.length === 0) {
          errors.push(`Row ${rowNum}: bu is required`);
          continue;
        }

        if (!region || region.length === 0) {
          errors.push(`Row ${rowNum}: region is required`);
          continue;
        }

        // Upsert
        await execute(
          `INSERT INTO student_mapping
           (user_id, mobile, student_name, bu, region, category, home_state)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (user_id) DO UPDATE SET
             mobile = $2,
             student_name = $3,
             bu = $4,
             region = $5,
             category = $6,
             home_state = $7`,
          [userId, mobile, studentName || null, bu, region, category || null, homeState || null]
        );

        added++;
      } catch (error) {
        errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      total: rows.length,
      added,
      errors,
    });
  } catch (error) {
    console.error('Error in admin mapping:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
