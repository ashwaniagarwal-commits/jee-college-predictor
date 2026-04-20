import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';

// JEE Advanced cutoff thresholds for different categories
const ADVANCED_CUTOFFS: Record<string, number> = {
  'OPEN': 93.1023262,
  'EWS': 80.3830119,
  'OBC-NCL': 79.4313582,
  'SC': 61.1526933,
  'ST': 47.9026465,
  'PwBD': 0.0079349,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      uploadId,
      userId,
      applicationNo,
      nameOnCard,
      crl,
      category,
      s1Nta,
      s2Nta,
      pcmNta,
      finalNta,
      catRank,
      pwbd,
      stateOfEligibility,
      gender,
      dob,
    } = body;

    if (!uploadId || !userId || !applicationNo || !nameOnCard || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Compute bestNta
    const bestNta = finalNta || Math.max(s1Nta || 0, s2Nta || 0);

    // Determine cutoff for the category
    const cutoff = ADVANCED_CUTOFFS[category] || ADVANCED_CUTOFFS['OPEN'];

    // Check if student qualifies for advanced
    const advancedQualified = bestNta >= cutoff;

    // Compute the cutoff that student achieved
    const advCutoffCat = bestNta;

    // Insert or replace scorecard result
    await execute(
      `INSERT INTO scorecard_result
       (user_id, application_no, name_on_card, category, pwbd, state_of_eligibility, s1_nta, s2_nta, best_nta, crl, cat_rank, pcm_nta, dob, gender, adv_cutoff_cat, advanced_qualified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (user_id) DO UPDATE SET
         application_no = $2,
         name_on_card = $3,
         category = $4,
         pwbd = $5,
         state_of_eligibility = $6,
         s1_nta = $7,
         s2_nta = $8,
         best_nta = $9,
         crl = $10,
         cat_rank = $11,
         pcm_nta = $12,
         dob = $13,
         gender = $14,
         adv_cutoff_cat = $15,
         advanced_qualified = $16`,
      [
        userId,
        applicationNo,
        nameOnCard,
        category,
        pwbd ? true : false,
        stateOfEligibility || null,
        s1Nta || null,
        s2Nta || null,
        bestNta,
        crl || null,
        catRank || null,
        pcmNta || null,
        dob || null,
        gender || null,
        advCutoffCat,
        advancedQualified,
      ]
    );

    // Update scorecard_upload status
    await execute(
      `UPDATE scorecard_upload SET ocr_status = $1 WHERE id = $2`,
      ['COMPLETED', uploadId]
    );

    return NextResponse.json({
      success: true,
      advancedQualified,
    });
  } catch (error) {
    console.error('Error in scorecard confirm:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
