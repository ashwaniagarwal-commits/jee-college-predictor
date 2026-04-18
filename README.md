# JEE College Predictor — Vedantu

Student uploads JEE Main scorecard and gets personalised college predictions.
Admin dashboard tracks results BU-wise, region-wise with all reports.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Seed the database (creates data/jee.db with sample data)
npx tsx src/lib/seed.ts

# 3. (Optional) Add Claude API key for scorecard OCR
cp .env.local.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# 4. Run the dev server
npm run dev
```

Open:
- Student flow: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin

## Test with Sample Data

The seed script creates 20 sample students. Try mobile: `9876543001` to look up a student.

To test the full flow:
1. Enter any 10-digit mobile number
2. Upload any image/PDF (or skip OCR by filling in manually)
3. Enter sample scores: CRL=5000, S2 NTA=95.5, Category=OPEN
4. View personalised college predictions

## Tech Stack

- **Frontend**: Next.js (App Router) + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite via sql.js (upgrade to Postgres for production)
- **OCR**: Claude API (Anthropic) — reads scorecard PDFs/images
- **Prediction**: Deterministic rank-band model on JoSAA historical cutoffs

## Project Structure

```
src/
  app/
    page.tsx              # Student landing (mobile lookup, upload, confirm)
    result/page.tsx       # College prediction results
    admin/
      page.tsx            # Admin dashboard (KPIs)
      mapping/page.tsx    # CSV mapping upload
      reports/            # All 6 report pages
    api/
      student/            # Lookup, register, scorecard, OCR, prediction
      admin/              # Mapping upload, reports, export
  lib/
    db.ts                 # SQLite database (sql.js)
    seed.ts               # Seed script
  components/             # Reusable UI components
data/
  jee.db                  # SQLite database file
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| ANTHROPIC_API_KEY | For OCR | Claude API key for scorecard parsing |

## Upgrading to Production

1. Replace SQLite with PostgreSQL (update db.ts queries)
2. Deploy to Vercel (frontend) + any Node.js host (API)
3. Add proper authentication (SSO for admin)
4. Upload real JoSAA cutoff data via admin CSV or seed script
