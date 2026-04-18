import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import * as Papa from 'papaparse';

interface CSVRow {
  [key: string]: string;
}

// Normalize a header to match known fields
function findValue(row: CSVRow, possibleKeys: string[]): string | undefined {
  // First try exact match
  for (const key of possibleKeys) {
    if (row[key] !== undefined) return row[key];
  }
  // Then try case-insensitive match against all row keys
  const rowKeys = Object.keys(row);
  for (const possible of possibleKeys) {
    const lower = possible.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const rowKey of rowKeys) {
      const rowLower = rowKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (rowLower === lower) return row[rowKey];
    }
  }
  return undefined;
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
      transformHeader: (header: string) => header.trim(),
    });

    const rows = parseResult.data as CSVRow[];
    const errors: Array<{ row: number; error: string }> = [];
    let rows_added = 0;
    let rows_updated = 0;

    // Log headers for debugging
    const headers = parseResult.meta?.fields || [];
    console.log('CSV Headers:', headers);
    console.log('Total rows:', rows.length);
    if (rows.length > 0) console.log('First row:', JSON.stringify(rows[0]));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const userId = findValue(row, ['Userid', 'user_id', 'userid', 'UserID', 'User ID', 'UserId'])?.trim();
        const bu = findValue(row, ['BU', 'bu', 'Bu', 'business_unit'])?.trim();
        let mobile = findValue(row, ['Contact number', 'contact number', 'mobile', 'Mobile', 'phone', 'Phone', 'contact', 'Contact'])?.trim()?.replace(/[^0-9]/g, '') || '';

        // Strip country code prefix
        if (mobile.startsWith('91') && mobile.length === 12) {
          mobile = mobile.substring(2);
        }

        // Validation
        if (!userId || userId.length === 0) {
          errors.push({ row: rowNum, error: `user_id is required (headers found: ${headers.join(', ')})` });
          continue;
        }

        if (!bu || bu.length === 0) {
          errors.push({ row: rowNum, error: 'bu is required' });
          continue;
        }

        if (!mobile || !/^\d{10}$/.test(mobile)) {
          errors.push({ row: rowNum, error: `mobile must be 10 digits, got "${mobile}" from original "${findValue(row, ['Contact number', 'mobile', 'phone'])}"` });
          continue;
        }

        // Optional fields
        const studentName = findValue(row, ['student_name', 'name', 'Name', 'Student Name'])?.trim() || null;
        const region = findValue(row, ['region', 'Region'])?.trim() || '';

        // Delete any existing record with same mobile (to avoid unique constraint)
        await execute('DELETE FROM student_mapping WHERE mobile = $1 AND user_id != $2', [mobile, userId]);

        // Upsert by user_id
        const result = await execute(
          `INSERT INTO student_mapping
           (user_id, mobile, student_name, bu, region)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id) DO UPDATE SET
             mobile = $2,
             student_name = COALESCE($3, student_mapping.student_name),
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
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined, // limit to first 20 errors
    });
  } catch (error) {
    console.error('Error in admin mapping:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
