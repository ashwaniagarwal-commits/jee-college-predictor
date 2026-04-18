import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';

interface PredictionItem {
  institute_name: string;
  institute_type: string;
  branch_name: string;
  quota: string;
  category: string;
  gender: string;
  openingRank: number;
  closingRank: number;
  medianClosingRank: number;
  ratio: number;
  admitProb: number;
  bucket: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const branches = searchParams.get('branches'); // comma-separated preferred branches

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    // Fetch scorecard result
    const scorecard = await queryOne<{
      crl: number;
      cat_rank: number | null;
      category: string;
    }>(
      'SELECT crl, cat_rank, category FROM scorecard_result WHERE user_id = $1',
      [userId]
    );

    if (!scorecard || !scorecard.crl) {
      return NextResponse.json(
        { error: 'Student scorecard not found or incomplete' },
        { status: 404 }
      );
    }

    const crl = scorecard.crl;
    const catRank = scorecard.cat_rank;
    const studentCategory = scorecard.category;

    // Build branch filter
    let branchFilter = '';
    const queryParams: unknown[] = [];

    if (branches) {
      const branchList = branches.split(',').map(b => b.trim()).filter(b => b.length > 0);
      if (branchList.length > 0) {
        const placeholders = branchList.map((_, i) => `$${i + 1}`).join(',');
        branchFilter = `AND branch_name IN (${placeholders})`;
        queryParams.push(...branchList);
      }
    }

    // Single optimized query: get median closing rank, latest closing rank, and opening rank per combination
    const allCutoffs = await query<{
      institute_name: string;
      institute_type: string;
      branch_name: string;
      quota: string;
      category: string;
      gender: string;
      median_closing: number;
      latest_closing: number;
      latest_opening: number;
    }>(
      `SELECT
        institute_name, institute_type, branch_name, quota, category, gender,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY closing_rank) AS median_closing,
        MAX(CASE WHEN year = 2024 THEN closing_rank END) AS latest_closing,
        MAX(CASE WHEN year = 2024 THEN opening_rank END) AS latest_opening
      FROM josaa_cutoffs
      WHERE round = 6
        AND institute_type != 'IIT'
        AND year IN (2022, 2023, 2024)
        ${branchFilter}
      GROUP BY institute_name, institute_type, branch_name, quota, category, gender
      HAVING PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY closing_rank) IS NOT NULL`,
      queryParams
    );

    const predictions: PredictionItem[] = [];

    for (const row of allCutoffs) {
      const medianClosingRank = Math.round(row.median_closing);
      if (medianClosingRank === 0) continue;

      // Determine which rank to use
      let rankToUse = crl;
      if (row.category !== 'Gender-Neutral' && row.category !== 'OPEN') {
        if (catRank && row.category === studentCategory) {
          rankToUse = catRank;
        }
      }

      const ratio = rankToUse / medianClosingRank;

      let bucket: string;
      let admitProb: number;
      if (ratio <= 0.85) {
        bucket = 'safe';
        admitProb = 0.95;
      } else if (ratio <= 1.1) {
        bucket = 'moderate';
        admitProb = 0.65;
      } else if (ratio <= 1.35) {
        bucket = 'ambitious';
        admitProb = 0.25;
      } else {
        continue;
      }

      predictions.push({
        institute_name: row.institute_name,
        institute_type: row.institute_type,
        branch_name: row.branch_name,
        quota: row.quota,
        category: row.category,
        gender: row.gender,
        openingRank: row.latest_opening || 0,
        closingRank: row.latest_closing || medianClosingRank,
        medianClosingRank,
        ratio: parseFloat(ratio.toFixed(4)),
        admitProb,
        bucket,
      });
    }

    // Batch insert predictions (skip if too many to avoid timeout)
    if (predictions.length > 0 && predictions.length <= 500) {
      const values: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;

      for (const pred of predictions) {
        placeholders.push(`($${idx}, $${idx+1}, $${idx+2}, $${idx+3}, $${idx+4}, $${idx+5}, $${idx+6}, $${idx+7}, $${idx+8}, $${idx+9}, $${idx+10}, $${idx+11})`);
        values.push(
          userId, pred.bucket, pred.institute_name, pred.institute_type,
          pred.branch_name, pred.quota, pred.category, pred.gender,
          pred.openingRank, pred.closingRank, pred.medianClosingRank, pred.admitProb
        );
        idx += 12;
      }

      await execute(
        `INSERT INTO prediction_run
         (user_id, bucket, institute_name, institute_type, branch_name, quota, category, gender, opening_rank, closing_rank, closing_rank_median, admit_prob)
         VALUES ${placeholders.join(',')}`,
        values
      );
    }

    // Group by bucket
    const grouped: Record<string, PredictionItem[]> = {
      safe: [],
      moderate: [],
      ambitious: [],
    };

    for (const pred of predictions) {
      grouped[pred.bucket].push(pred);
    }

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('Error in prediction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
