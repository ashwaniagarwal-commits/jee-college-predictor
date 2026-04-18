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
      'nta': 'sr.best_nta',
      'crl': 'sr.crl',
      'bu': 'sm.bu',
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
      s2_nta: number;
      crl: number;
      cat_rank: number;
      advanced_qualified: boolean;
      bu: string;
      mobile: string;
    }>(
      `SELECT sr.user_id, sr.name_on_card, sr.category, sr.state_of_eligibility,
              sr.best_nta, sr.s1_nta, sr.s2_nta, sr.crl, sr.cat_rank,
              sr.advanced_qualified, sm.bu, sm.mobile
       FROM scorecard_result sr
       JOIN student_mapping sm ON sr.user_id = sm.user_id
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
