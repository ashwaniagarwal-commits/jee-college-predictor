import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface ExportRow {
  [key: string]: unknown;
}

function toCSV(rows: ExportRow[], columns: string[]): string {
  const header = columns.join(',');
  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        const str = String(value);
        // Escape quotes and wrap in quotes if needed
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(',')
  );
  return [header, ...dataRows].join('\n');
}

interface MappedRow {
  bu: string;
  count: number;
}

interface UploadedRow {
  bu: string;
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const report = searchParams.get('report');
    const format = searchParams.get('format');

    if (!report || format !== 'csv') {
      return NextResponse.json(
        { error: 'report and format=csv parameters are required' },
        { status: 400 }
      );
    }

    let results: ExportRow[] = [];
    let columns: string[] = [];

    if (report === 'top-percentile') {
      results = await query<ExportRow>(`
        SELECT sr.*, sm.bu, sm.region, sm.mobile
        FROM scorecard_result sr
        JOIN student_mapping sm ON sr.user_id = sm.user_id
        ORDER BY sr.best_nta DESC
      `);

      columns = [
        'user_id',
        'application_no',
        'name_on_card',
        'category',
        'best_nta',
        'crl',
        'bu',
        'region',
        'mobile',
      ];
    } else if (report === 'air-bucket') {
      results = await query<ExportRow>(`
        SELECT sr.*, sm.bu, sm.region
        FROM scorecard_result sr
        JOIN student_mapping sm ON sr.user_id = sm.user_id
        ORDER BY sr.crl ASC
      `);

      columns = [
        'user_id',
        'application_no',
        'name_on_card',
        'crl',
        'category',
        'bu',
        'region',
      ];
    } else if (report === 'advanced-qualifiers') {
      results = await query<ExportRow>(`
        SELECT sr.*, sm.bu, sm.region
        FROM scorecard_result sr
        JOIN student_mapping sm ON sr.user_id = sm.user_id
        WHERE sr.advanced_qualified = true
      `);

      columns = [
        'user_id',
        'application_no',
        'name_on_card',
        'category',
        'best_nta',
        'crl',
        'bu',
        'region',
      ];
    } else if (report === 'session-improvement') {
      results = await query<ExportRow>(`
        SELECT sr.*, sm.bu, sm.region, (sr.s2_nta - sr.s1_nta) as delta
        FROM scorecard_result sr
        JOIN student_mapping sm ON sr.user_id = sm.user_id
        WHERE sr.s1_nta IS NOT NULL AND sr.s2_nta IS NOT NULL
        AND sr.s2_nta > sr.s1_nta
        ORDER BY delta DESC
      `);

      columns = [
        'user_id',
        'application_no',
        'name_on_card',
        's1_nta',
        's2_nta',
        'delta',
        'bu',
        'region',
      ];
    } else if (report === 'bu-totals') {
      // Build bu-totals data
      const mappedRows = await query<MappedRow>(`
        SELECT bu, COUNT(*) as count
        FROM student_mapping
        GROUP BY bu
      `);

      const mappedCounts: Record<string, number> = {};
      for (const row of mappedRows) {
        mappedCounts[row.bu] = row.count;
      }

      const uploadedRows = await query<UploadedRow>(`
        SELECT sm.bu, COUNT(*) as count
        FROM scorecard_result sr
        JOIN student_mapping sm ON sr.user_id = sm.user_id
        GROUP BY sm.bu
      `);

      const uploadedCounts: Record<string, number> = {};
      for (const row of uploadedRows) {
        uploadedCounts[row.bu] = row.count;
      }

      const allBUs = new Set([
        ...Object.keys(mappedCounts),
        ...Object.keys(uploadedCounts),
      ]);

      for (const bu of Array.from(allBUs).sort()) {
        const mapped = mappedCounts[bu] || 0;
        const uploaded = uploadedCounts[bu] || 0;
        const percentage = mapped > 0 ? (uploaded / mapped) * 100 : 0;

        results.push({
          bu,
          mapped,
          uploaded,
          percentage: parseFloat(percentage.toFixed(2)),
        });
      }

      columns = ['bu', 'mapped', 'uploaded', 'percentage'];
    } else {
      return NextResponse.json(
        { error: 'Invalid report type' },
        { status: 400 }
      );
    }

    const csv = toCSV(results, columns);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${report}-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error in export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
