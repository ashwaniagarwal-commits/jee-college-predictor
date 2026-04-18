import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';

interface StudentMapping {
  user_id: string;
  home_state: string | null;
}

interface ScorecardResult {
  user_id: string;
  crl: number;
  cat_rank: number | null;
  category: string;
}

interface JosaaCutoff {
  institute_name: string;
  institute_type: string;
  branch_name: string;
  quota: string;
  category: string;
  gender: string;
  opening_rank: number | null;
  closing_rank: number;
  year: number;
}

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

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    // Fetch scorecard result
    const scorecard = await queryOne<ScorecardResult>(
      'SELECT * FROM scorecard_result WHERE user_id = $1',
      [userId]
    );

    if (!scorecard || !scorecard.crl) {
      return NextResponse.json(
        { error: 'Student scorecard not found or incomplete' },
        { status: 404 }
      );
    }

    // Fetch home_state from student_mapping
    const studentMapping = await queryOne<StudentMapping>(
      'SELECT home_state FROM student_mapping WHERE user_id = $1',
      [userId]
    );

    const homeState = studentMapping?.home_state || null;
    const crl = scorecard.crl;
    const catRank = scorecard.cat_rank;
    const studentCategory = scorecard.category;

    // Get all unique combinations from josaa_cutoffs for round 6
    const combinations = await query<{
      institute_name: string;
      institute_type: string;
      branch_name: string;
      quota: string;
      category: string;
      gender: string;
    }>(
      `SELECT DISTINCT institute_name, institute_type, branch_name, quota, category, gender
       FROM josaa_cutoffs
       WHERE round = 6
       ORDER BY institute_name, branch_name, quota, category, gender`
    );

    const predictions: PredictionItem[] = [];

    // For each combination, get closing ranks from all 3 years
    for (const combo of combinations) {
      const closingRankRows = await query<{ closing_rank: number }>(
        `SELECT closing_rank FROM josaa_cutoffs
         WHERE institute_name = $1 AND branch_name = $2 AND quota = $3 AND category = $4 AND gender = $5
         AND round = 6 AND year IN (2021, 2022, 2023)
         ORDER BY year DESC`,
        [
          combo.institute_name,
          combo.branch_name,
          combo.quota,
          combo.category,
          combo.gender,
        ]
      );

      const closingRanks = closingRankRows
        .map(r => r.closing_rank)
        .filter(r => r != null);

      if (closingRanks.length === 0) continue;

      // Compute median
      const sorted = [...closingRanks].sort((a, b) => a - b);
      const medianClosingRank =
        sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];

      // Determine which rank to use
      let rankToUse = crl;
      if (combo.category !== 'Gender-Neutral' && combo.category !== 'OPEN') {
        // For category-specific seats, use cat_rank if available and category matches
        if (catRank && combo.category === studentCategory) {
          rankToUse = catRank;
        }
      }

      const ratio = rankToUse / medianClosingRank;

      let bucket: string;
      if (ratio <= 0.85) {
        bucket = 'safe';
      } else if (ratio <= 1.1) {
        bucket = 'moderate';
      } else if (ratio <= 1.35) {
        bucket = 'ambitious';
      } else {
        continue; // Skip this combination
      }

      // Get opening rank from latest year (2023)
      const openingRankRow = await queryOne<{ opening_rank: number | null }>(
        `SELECT opening_rank FROM josaa_cutoffs
         WHERE institute_name = $1 AND branch_name = $2 AND quota = $3 AND category = $4 AND gender = $5
         AND round = 6 AND year = 2023`,
        [
          combo.institute_name,
          combo.branch_name,
          combo.quota,
          combo.category,
          combo.gender,
        ]
      );

      const openingRank = openingRankRow?.opening_rank || null;

      // Compute admit probability (simplified)
      let admitProb = 0;
      if (ratio <= 0.85) {
        admitProb = 0.95;
      } else if (ratio <= 1.1) {
        admitProb = 0.65;
      } else if (ratio <= 1.35) {
        admitProb = 0.25;
      }

      predictions.push({
        institute_name: combo.institute_name,
        institute_type: combo.institute_type,
        branch_name: combo.branch_name,
        quota: combo.quota,
        category: combo.category,
        gender: combo.gender,
        openingRank: openingRank || 0,
        closingRank: closingRanks[0],
        medianClosingRank: Math.round(medianClosingRank),
        ratio: parseFloat(ratio.toFixed(4)),
        admitProb: parseFloat(admitProb.toFixed(2)),
        bucket,
      });
    }

    // Insert into prediction_run table
    for (const pred of predictions) {
      await execute(
        `INSERT INTO prediction_run
         (user_id, bucket, institute_name, institute_type, branch_name, quota, category, gender, opening_rank, closing_rank, closing_rank_median, admit_prob)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          userId,
          pred.bucket,
          pred.institute_name,
          pred.institute_type,
          pred.branch_name,
          pred.quota,
          pred.category,
          pred.gender,
          pred.openingRank,
          pred.closingRank,
          pred.medianClosingRank,
          pred.admitProb,
        ]
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
