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

    // Deduplicate: keep one entry per institute+branch combo (prefer OPEN category, best bucket)
    const seen = new Map<string, PredictionItem>();
    const bucketPriority: Record<string, number> = { safe: 1, moderate: 2, ambitious: 3 };

    for (const pred of predictions) {
      const key = `${pred.institute_name}|${pred.branch_name}`;
      const existing = seen.get(key);

      if (!existing) {
        seen.set(key, pred);
      } else {
        // Prefer the one with better bucket (safe > moderate > ambitious)
        const existingPriority = bucketPriority[existing.bucket] || 99;
        const newPriority = bucketPriority[pred.bucket] || 99;
        if (newPriority < existingPriority) {
          seen.set(key, pred);
        } else if (newPriority === existingPriority && pred.category === 'OPEN') {
          // Same bucket, prefer OPEN category
          seen.set(key, pred);
        }
      }
    }

    const uniquePredictions = Array.from(seen.values());

    // Sort by closing rank (ascending = best ranked colleges first)
    uniquePredictions.sort((a, b) => a.medianClosingRank - b.medianClosingRank);

    // Group by bucket
    const grouped: Record<string, PredictionItem[]> = {
      safe: [],
      moderate: [],
      ambitious: [],
    };

    for (const pred of uniquePredictions) {
      grouped[pred.bucket].push(pred);
    }

    // Sort each bucket by closing rank
    grouped.safe.sort((a, b) => a.medianClosingRank - b.medianClosingRank);
    grouped.moderate.sort((a, b) => a.medianClosingRank - b.medianClosingRank);
    grouped.ambitious.sort((a, b) => a.medianClosingRank - b.medianClosingRank);

    return NextResponse.json({ ...grouped, studentCrl: crl });
  } catch (error) {
    console.error('Error in prediction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
