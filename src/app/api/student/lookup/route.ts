import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

interface StudentMapping {
  user_id: string;
  student_name: string | null;
  bu: string;
  region: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobile } = body;

    if (!mobile) {
      return NextResponse.json(
        { error: 'Mobile number is required' },
        { status: 400 }
      );
    }

    const result = await queryOne<StudentMapping>(
      'SELECT user_id, student_name, bu, region FROM student_mapping WHERE mobile = $1',
      [mobile]
    );

    if (!result) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      firstName: result.student_name,
      userId: result.user_id,
      bu: result.bu,
      region: result.region,
    });
  } catch (error) {
    console.error('Error in student lookup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
