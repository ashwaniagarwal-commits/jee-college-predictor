import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobile, name, bu, region } = body;

    if (!mobile || !name || !bu || !region) {
      return NextResponse.json(
        { error: 'Mobile, name, bu, and region are required' },
        { status: 400 }
      );
    }

    const userId = uuidv4();

    await execute(
      `INSERT INTO student_mapping (user_id, mobile, student_name, bu, region)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, mobile, name, bu, region]
    );

    return NextResponse.json({ userId });
  } catch (error: any) {
    console.error('Error in student register:', error);

    if (error.message && error.message.includes('unique constraint')) {
      return NextResponse.json(
        { error: 'Mobile number already registered' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
