import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const bu = searchParams.get('bu') || '';
    const sortBy = searchParams.get('sortBy') || 'crl';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = ['sr.crl IS NOT NULL'];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(sr.name_on_card ILIKE $${paramIdx} OR sm.mobile ILIKE $${paramIdx} OR sm.user_id ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (bu) {
      conditions.push(`sm.bu = $${paramIdx}`);
      params.push(bu);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate sort column
    const allowedSorts: Record<string, string> = {
      'name': 'sr.name_on_card',
      'category': 'sr.category',
      'state': 'sr.state_of_eligibility',
      's1nta': 'sr.s1_nta',
      's1phy': 'sr.s1_physics',
      's1chem': 'sr.s1_chemistry',
      's1math': 'sr.s1_maths',
      's2nta': 'sr.s2_nta',
      's2phy': 'sr.s2_physics',
      's2chem': 'sr.s2_chemistry',
      's2math': 'sr.s2_maths',
      'nta': 'sr.best_nta',
      'crl': 'sr.crl',
      'catrank': 'sr.cat_rank',
      'bu': 'sm.bu',
      'gender': 'sr.gender',
    };
    const sortColumn = allowedSorts[sortBy] || 'sr.crl';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM scorecard_result sr
       JOIN student_mapping sm ON sr.user_id = sm.user_id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0]?.count || '0');

    // Get paginated data
    const students = await query<{
      user_id: string;
      name_on_card: string;
      category: string;
      state_of_eligibility: string;
      best_nta: number;
      s1_nta: number;
      s1_physics: number;
      s1_chemistry: number;
      s1_maths: number;
      s2_nta: number;
      s2_physics: number;
      s2_chemistry: number;
      s2_maths: number;
      crl: number;
      cat_rank: number;
      application_no: string;
      dob: string;
      gender: string;
      advanced_qualified: boolean;
      bu: string;
      mobile: string;
      s3_key: string | null;
    }>(
      `SELECT sr.user_id, sr.name_on_card, sr.category, sr.state_of_eligibility,
              sr.best_nta, sr.s1_nta, sr.s1_physics, sr.s1_chemistry, sr.s1_maths,
              sr.s2_nta, sr.s2_physics, sr.s2_chemistry, sr.s2_maths, sr.crl, sr.cat_rank,
              sr.application_no, sr.dob, sr.gender,
              sr.advanced_qualified, sm.bu, sm.mobile,
              su.s3_key
       FROM scorecard_result sr
       JOIN student_mapping sm ON sr.user_id = sm.user_id
       LEFT JOIN LATERAL (
         SELECT s3_key FROM scorecard_upload
         WHERE user_id = sr.user_id AND s3_key IS NOT NULL
         ORDER BY uploaded_at DESC LIMIT 1
       ) su ON true
       ${whereClause}
       ORDER BY ${sortColumn} ${order} NULLS LAST
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    // Get BU options for filter
    const buOptions = await query<{ bu: string }>(
      `SELECT DISTINCT sm.bu FROM student_mapping sm
       JOIN scorecard_result sr ON sr.user_id = sm.user_id
       WHERE sm.bu IS NOT NULL AND sm.bu != ''
       ORDER BY sm.bu`
    );

    return NextResponse.json({
      students,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      buOptions: buOptions.map(b => b.bu),
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
