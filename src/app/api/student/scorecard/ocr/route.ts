import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

interface ScorecardUpload {
  id: string;
  user_id: string;
  file_path: string;
  s3_key: string | null;
  ocr_status: string;
  ocr_raw_json: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { uploadId, userId } = await request.json();

    if (!uploadId || !userId) {
      return NextResponse.json({ error: 'uploadId and userId required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    // Get the upload record
    const upload = await queryOne<ScorecardUpload>(
      'SELECT * FROM scorecard_upload WHERE id = $1 AND user_id = $2',
      [uploadId, userId]
    );

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    const filePath = upload.file_path;
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Uploaded file not found on disk' }, { status: 404 });
    }

    // Read the file and determine media type
    const fileBuffer = fs.readFileSync(fullPath);
    const base64Data = fileBuffer.toString('base64');
    const ext = path.extname(filePath).toLowerCase();

    let mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' | 'application/pdf';
    if (ext === '.pdf') {
      mediaType = 'application/pdf';
    } else if (ext === '.png') {
      mediaType = 'image/png';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      mediaType = 'image/jpeg';
    } else {
      mediaType = 'image/png';
    }

    // Call Claude API to extract scorecard data
    const client = new Anthropic({ apiKey });

    const contentBlock = mediaType === 'application/pdf'
      ? {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: mediaType,
            data: base64Data,
          },
        }
      : {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mediaType,
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
  "session1_nta_score": null or number - Total NTA Score for Session 1 / January attempt,
  "session2_nta_score": null or number - Total NTA Score for Session 2 / April attempt,
  "crl": number - All India Rank (Common Rank List),
  "category_rank": null or number - Category Rank if available,
  "dob": "string - date of birth if visible"
}

Rules:
- NTA scores are percentile values (0-100 with many decimal places like 93.1023262)
- CRL is an integer rank (like 54032)
- If a field is not visible or not applicable, use null
- For category: if it says "GENERAL" or nothing specific, use "OPEN"
- Return ONLY the JSON, nothing else`
            }
          ]
        }
      ]
    });

    // Parse Claude's response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Try to extract JSON from the response
    let parsed;
    try {
      // Try direct parse first
      parsed = JSON.parse(responseText);
    } catch {
      // Try to find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse OCR response as JSON');
      }
    }

    // Store OCR raw response
    await execute(
      'UPDATE scorecard_upload SET ocr_status = $1, ocr_raw_json = $2 WHERE id = $3',
      ['COMPLETED', JSON.stringify(parsed), uploadId]
    );

    return NextResponse.json({
      success: true,
      data: {
        applicationNo: parsed.application_no || '',
        nameOnCard: parsed.candidate_name || '',
        category: parsed.category || 'OPEN',
        pwbd: parsed.pwbd || false,
        s1Nta: parsed.session1_nta_score,
        s2Nta: parsed.session2_nta_score,
        crl: parsed.crl,
        catRank: parsed.category_rank,
      }
    });

  } catch (error) {
    console.error('OCR error:', error);
    return NextResponse.json(
      { error: 'OCR processing failed', details: String(error) },
      { status: 500 }
    );
  }
}
