import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { uploadToS3 } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      );
    }

    const uploadId = uuidv4();
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'bin';

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString('base64');

    // Upload to S3 (optional)
    let s3Key: string | null = null;
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        s3Key = `scorecards/${userId}/${timestamp}.${ext}`;
        await uploadToS3(s3Key, buffer, file.type || 'application/octet-stream');
      } catch (e) {
        console.warn('S3 upload skipped:', e);
        s3Key = null;
      }
    }

    // Insert upload record into database
    await execute(
      `INSERT INTO scorecard_upload (id, user_id, file_path, s3_key, ocr_status)
       VALUES ($1, $2, $3, $4, $5)`,
      [uploadId, userId, `memory://${timestamp}.${ext}`, s3Key, 'PENDING']
    );

    // Try OCR with Claude API
    let ocrData = null;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey && apiKey !== 's') {
      try {
        const client = new Anthropic({ apiKey });

        const mediaType = ext === 'pdf' ? 'application/pdf' :
                          ext === 'png' ? 'image/png' :
                          (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : 'image/png';

        const contentBlock = mediaType === 'application/pdf'
          ? {
              type: 'document' as const,
              source: {
                type: 'base64' as const,
                media_type: mediaType as 'application/pdf',
                data: base64Data,
              },
            }
          : {
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: mediaType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
                data: base64Data,
              },
            };

        const message = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: [
                contentBlock,
                {
                  type: 'text',
                  text: `This is a JEE Main NTA scorecard. Extract the following fields and return ONLY a valid JSON object (no markdown, no backticks, no explanation):

{
  "application_no": "string - the Application Number",
  "candidate_name": "string - full name of the candidate",
  "category": "string - one of: OPEN, OBC-NCL, SC, ST, EWS",
  "pwbd": false,
  "state_of_eligibility": "string - State of Eligibility as shown on the scorecard",
  "session1_nta_score": null or number - Total NTA Score for Session 1 / January attempt,
  "session2_nta_score": null or number - Total NTA Score for Session 2 / April attempt,
  "final_total_nta_score": null or number - Final Total NTA Score (the best/final percentile),
  "crl": number - All India Rank (Common Rank List),
  "category_rank": null or number - Category Rank if available,
  "dob": "string - date of birth if visible"
}

Rules:
- NTA scores are percentile values (0-100 with many decimal places like 93.1023262)
- CRL is an integer rank (like 54032)
- If a field is not visible or not applicable, use null
- For category: if it says "GENERAL" or nothing specific, use "OPEN"
- State of Eligibility is the state name (e.g., "Maharashtra", "Delhi", "Tamil Nadu")
- Final Total NTA Score is the overall best percentile score
- Return ONLY the JSON, nothing else`
                }
              ]
            }
          ]
        });

        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

        let parsed;
        try {
          parsed = JSON.parse(responseText);
        } catch {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('Could not parse OCR response');
          }
        }

        // Update upload record
        await execute(
          'UPDATE scorecard_upload SET ocr_status = $1, ocr_raw_json = $2 WHERE id = $3',
          ['COMPLETED', JSON.stringify(parsed), uploadId]
        );

        ocrData = {
          applicationNo: parsed.application_no || '',
          nameOnCard: parsed.candidate_name || '',
          category: parsed.category || 'OPEN',
          pwbd: parsed.pwbd || false,
          stateOfEligibility: parsed.state_of_eligibility || '',
          s1Nta: parsed.session1_nta_score,
          s2Nta: parsed.session2_nta_score,
          finalNta: parsed.final_total_nta_score,
          crl: parsed.crl,
          catRank: parsed.category_rank,
        };
      } catch (ocrError) {
        console.error('OCR failed:', ocrError);
        await execute(
          'UPDATE scorecard_upload SET ocr_status = $1 WHERE id = $2',
          ['FAILED', uploadId]
        );
      }
    }

    return NextResponse.json({
      uploadId,
      status: ocrData ? 'completed' : 'manual_needed',
      ocrSuccess: !!ocrData,
      data: ocrData,
    });
  } catch (error) {
    console.error('Error in scorecard upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
