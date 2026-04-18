import { NextRequest, NextResponse } from 'next/server';
import { execute, getPool } from '@/lib/db';
import * as Papa from 'papaparse';

interface CSVRow {
  [key: string]: string;
}

function findValue(row: CSVRow, possibleKeys: string[]): string | undefined {
  for (const key of possibleKeys) {
    if (row[key] !== undefined) return row[key];
  }
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

export const maxDuration = 60; // Allow up to 60 seconds on Vercel

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const text = await file.text();

    const parseResult = Papa.parse<CSVRow>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: (header: string) => header.trim(),
    });

    const rows = parseResult.data as CSVRow[];
    const errors: Array<{ row: number; error: string }> = [];
    let rows_added = 0;

    // Process in batches of 500
    const BATCH_SIZE = 500;
    const validRows: Array<[string, string, string | null, string, string]> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const userId = findValue(row, ['Userid', 'user_id', 'userid', 'UserID', 'User ID', 'UserId'])?.trim();
      const bu = findValue(row, ['BU', 'bu', 'Bu', 'business_unit'])?.trim();
      let mobile = findValue(row, ['Contact number', 'contact number', 'mobile', 'Mobile', 'phone', 'Phone', 'contact', 'Contact'])?.trim()?.replace(/[^0-9]/g, '') || '';

      if (mobile.startsWith('91') && mobile.length === 12) {
        mobile = mobile.substring(2);
      }

      if (!userId || userId.length === 0) {
        if (errors.length < 10) errors.push({ row: rowNum, error: 'user_id is required' });
        continue;
      }
      if (!bu || bu.length === 0) {
        if (errors.length < 10) errors.push({ row: rowNum, error: 'bu is required' });
        continue;
      }
      if (!mobile || !/^\d{10}$/.test(mobile)) {
        if (errors.length < 10) errors.push({ row: rowNum, error: `mobile must be 10 digits, got "${mobile}"` });
        continue;
      }

      const studentName = findValue(row, ['student_name', 'name', 'Name', 'Student Name'])?.trim() || null;
      const region = findValue(row, ['region', 'Region'])?.trim() || '';

      validRows.push([userId, mobile, studentName, bu, region]);
    }

    // Batch insert using a single query per batch
    for (let b = 0; b < validRows.length; b += BATCH_SIZE) {
      const batch = validRows.slice(b, b + BATCH_SIZE);
      const values: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;

      for (const [userId, mobile, studentName, bu, region] of batch) {
        placeholders.push(`($${idx}, $${idx+1}, $${idx+2}, $${idx+3}, $${idx+4})`);
        values.push(userId, mobile, studentName, bu, region);
        idx += 5;
      }

      try {
        await getPool().query(
          `INSERT INTO student_mapping (user_id, mobile, student_name, bu, region)
           VALUES ${placeholders.join(',')}
           ON CONFLICT (user_id) DO UPDATE SET
             mobile = EXCLUDED.mobile,
             student_name = COALESCE(EXCLUDED.student_name, student_mapping.student_name),
             bu = EXCLUDED.bu,
             region = CASE WHEN EXCLUDED.region = '' THEN student_mapping.region ELSE EXCLUDED.region END`,
          values
        );
        rows_added += batch.length;
      } catch (err) {
        // If batch fails (e.g., duplicate mobile), fall back to row-by-row
        for (const [userId, mobile, studentName, bu, region] of batch) {
          try {
            await execute(
              `INSERT INTO student_mapping (user_id, mobile, student_name, bu, region)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (user_id) DO UPDATE SET
                 mobile = EXCLUDED.mobile,
                 student_name = COALESCE(EXCLUDED.student_name, student_mapping.student_name),
                 bu = EXCLUDED.bu,
                 region = CASE WHEN EXCLUDED.region = '' THEN student_mapping.region ELSE EXCLUDED.region END`,
              [userId, mobile, studentName, bu, region]
            );
            rows_added++;
          } catch (rowErr) {
            if (errors.length < 20) {
              errors.push({ row: 0, error: `${userId}: ${rowErr instanceof Error ? rowErr.message : 'Unknown error'}` });
            }
          }
        }
      }
    }

    return NextResponse.json({
      rows_added,
      rows_updated: 0,
      total: rows.length,
      valid: validRows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in admin mapping:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
