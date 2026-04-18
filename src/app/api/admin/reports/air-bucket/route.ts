import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface AirBucketRow {
  crl: number;
  bu: string;
  region: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucketParam = searchParams.get('bucket');

    let bucketLimit = 100;
    if (bucketParam === '1000') {
      bucketLimit = 1000;
    } else if (bucketParam === '10000') {
      bucketLimit = 10000;
    }

    const results = await query<AirBucketRow>(`
      SELECT sr.*, sm.bu, sm.region
      FROM scorecard_result sr
      JOIN student_mapping sm ON sr.user_id = sm.user_id
      WHERE sr.crl <= $1
      ORDER BY sr.crl ASC
    `, [bucketLimit]);

    return NextResponse.json({
      bucket: bucketLimit,
      count: results.length,
      students: results,
    });
  } catch (error) {
    console.error('Error in air-bucket report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
