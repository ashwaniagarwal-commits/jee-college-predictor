import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface BURegionCount {
  bu: string;
  region: string;
  uploaded: number;
  total: number;
}

interface UploadedRow {
  bu: string;
  region: string;
  uploaded: number;
}

interface TotalRow {
  bu: string;
  region: string;
  total: number;
}

export async function GET(request: NextRequest) {
  try {
    // Get uploaded counts
    const uploadedRows = await query<UploadedRow>(`
      SELECT sm.bu, sm.region, COUNT(*) as uploaded
      FROM scorecard_result sr
      JOIN student_mapping sm ON sr.user_id = sm.user_id
      GROUP BY sm.bu, sm.region
    `);

    const uploadedCounts: Record<string, Record<string, number>> = {};
    for (const row of uploadedRows) {
      if (!uploadedCounts[row.bu]) {
        uploadedCounts[row.bu] = {};
      }
      uploadedCounts[row.bu][row.region] = row.uploaded;
    }

    // Get total mapped counts
    const totalRows = await query<TotalRow>(`
      SELECT bu, region, COUNT(*) as total
      FROM student_mapping
      GROUP BY bu, region
    `);

    const totalCounts: Record<string, Record<string, number>> = {};
    for (const row of totalRows) {
      if (!totalCounts[row.bu]) {
        totalCounts[row.bu] = {};
      }
      totalCounts[row.bu][row.region] = row.total;
    }

    // Merge data
    const allBUs = new Set([
      ...Object.keys(uploadedCounts),
      ...Object.keys(totalCounts),
    ]);
    const allRegions = new Set<string>();

    for (const bu of allBUs) {
      Object.keys(uploadedCounts[bu] || {}).forEach((r) =>
        allRegions.add(r)
      );
      Object.keys(totalCounts[bu] || {}).forEach((r) =>
        allRegions.add(r)
      );
    }

    const matrix: BURegionCount[] = [];

    for (const bu of Array.from(allBUs).sort()) {
      for (const region of Array.from(allRegions).sort()) {
        const uploaded = uploadedCounts[bu]?.[region] || 0;
        const total = totalCounts[bu]?.[region] || 0;

        matrix.push({
          bu,
          region,
          uploaded,
          total,
        });
      }
    }

    return NextResponse.json(matrix);
  } catch (error) {
    console.error('Error in bu-region report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
