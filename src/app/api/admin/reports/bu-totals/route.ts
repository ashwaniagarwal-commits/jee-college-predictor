import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface BUTotal {
  bu: string;
  mapped: number;
  uploaded: number;
  percentage: number;
}

interface MappedRow {
  bu: string;
  count: number;
}

interface UploadedRow {
  bu: string;
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    // Get mapped counts per BU
    const mappedRows = await query<MappedRow>(`
      SELECT bu, COUNT(*) as count
      FROM student_mapping
      GROUP BY bu
    `);

    const mappedCounts: Record<string, number> = {};
    for (const row of mappedRows) {
      mappedCounts[row.bu] = row.count;
    }

    // Get uploaded counts per BU
    const uploadedRows = await query<UploadedRow>(`
      SELECT sm.bu, COUNT(*) as count
      FROM scorecard_result sr
      JOIN student_mapping sm ON sr.user_id = sm.user_id
      GROUP BY sm.bu
    `);

    const uploadedCounts: Record<string, number> = {};
    for (const row of uploadedRows) {
      uploadedCounts[row.bu] = row.count;
    }

    // Build result
    const results: BUTotal[] = [];
    const allBUs = new Set([
      ...Object.keys(mappedCounts),
      ...Object.keys(uploadedCounts),
    ]);

    for (const bu of Array.from(allBUs).sort()) {
      const mapped = mappedCounts[bu] || 0;
      const uploaded = uploadedCounts[bu] || 0;
      const percentage = mapped > 0 ? (uploaded / mapped) * 100 : 0;

      results.push({
        bu,
        mapped,
        uploaded,
        percentage: parseFloat(percentage.toFixed(2)),
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in bu-totals report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
