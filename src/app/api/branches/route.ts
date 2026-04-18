import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const branches = await query<{ branch_name: string; count: number }>(
      `SELECT branch_name, COUNT(DISTINCT institute_name) as count
       FROM josaa_cutoffs
       WHERE institute_type != 'IIT'
       GROUP BY branch_name
       ORDER BY count DESC, branch_name ASC`
    );

    return NextResponse.json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
