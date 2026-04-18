import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface BUCount {
  [bu: string]: number;
}

interface QualifierRow {
  bu: string;
  [key: string]: unknown;
}

interface CountRow {
  bu: string;
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bu = searchParams.get('bu');

    let sql = `
      SELECT sr.*, sm.bu, sm.region
      FROM scorecard_result sr
      JOIN student_mapping sm ON sr.user_id = sm.user_id
      WHERE sr.advanced_qualified = true
    `;
    const params: unknown[] = [];

    if (bu) {
      sql += ` AND sm.bu = $1`;
      params.push(bu);
    }

    const students = await query<QualifierRow>(sql, params);

    // Get BU-wise counts
    let countSql = `
      SELECT sm.bu, COUNT(*) as count
      FROM scorecard_result sr
      JOIN student_mapping sm ON sr.user_id = sm.user_id
      WHERE sr.advanced_qualified = true
    `;
    const countParams: unknown[] = [];

    if (bu) {
      countSql += ` AND sm.bu = $1`;
      countParams.push(bu);
    }

    countSql += ` GROUP BY sm.bu`;

    const countRows = await query<CountRow>(countSql, countParams);

    const buCounts: BUCount = {};
    for (const row of countRows) {
      buCounts[row.bu] = row.count;
    }

    return NextResponse.json({
      students,
      buCounts,
    });
  } catch (error) {
    console.error('Error in advanced-qualifiers report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
