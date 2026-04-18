import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface ImprovementRow {
  user_id: string;
  s1_nta: number | null;
  s2_nta: number | null;
  bu: string;
  region: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minDeltaParam = searchParams.get('minDelta');
    const minDelta = minDeltaParam ? parseInt(minDeltaParam, 10) : 1;

    const results = await query<ImprovementRow>(`
      SELECT sr.*, sm.bu, sm.region, (sr.s2_nta - sr.s1_nta) as delta
      FROM scorecard_result sr
      JOIN student_mapping sm ON sr.user_id = sm.user_id
      WHERE sr.s1_nta IS NOT NULL AND sr.s2_nta IS NOT NULL
      AND sr.s2_nta > sr.s1_nta
      AND (sr.s2_nta - sr.s1_nta) >= $1
      ORDER BY delta DESC
    `, [minDelta]);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in session-improvement report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
