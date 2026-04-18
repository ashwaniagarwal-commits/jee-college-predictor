import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface TopPercentileRow {
  user_id: string;
  best_nta: number;
  bu: string;
  region: string;
  mobile: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minParam = searchParams.get('min');
    const min = minParam ? parseInt(minParam, 10) : 99;

    const results = await query<TopPercentileRow>(`
      SELECT sr.*, sm.bu, sm.region, sm.mobile
      FROM scorecard_result sr
      JOIN student_mapping sm ON sr.user_id = sm.user_id
      WHERE sr.best_nta >= $1
      ORDER BY sr.best_nta DESC
    `, [min]);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in top-percentile report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
