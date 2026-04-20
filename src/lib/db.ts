import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'postgres',
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
      max: 10,
    });
  }
  return pool;
}

// Helper: run a query and return rows
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}

// Helper: run a query and return first row or null
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

// Helper: run INSERT/UPDATE/DELETE
export async function execute(
  text: string,
  params?: unknown[]
): Promise<number> {
  const result = await getPool().query(text, params);
  return result.rowCount || 0;
}

// Initialize all tables
export async function initDb(): Promise<void> {
  const statements = `
    CREATE TABLE IF NOT EXISTS student_mapping (
      user_id TEXT PRIMARY KEY,
      mobile TEXT NOT NULL UNIQUE,
      student_name TEXT,
      bu TEXT NOT NULL,
      region TEXT NOT NULL,
      category TEXT,
      home_state TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS scorecard_upload (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES student_mapping(user_id),
      file_path TEXT,
      s3_key TEXT,
      uploaded_at TIMESTAMP DEFAULT NOW(),
      ocr_status TEXT DEFAULT 'PENDING',
      ocr_raw_json TEXT
    );

    CREATE TABLE IF NOT EXISTS scorecard_result (
      user_id TEXT PRIMARY KEY REFERENCES student_mapping(user_id),
      application_no TEXT,
      name_on_card TEXT,
      category TEXT,
      pwbd BOOLEAN DEFAULT FALSE,
      state_of_eligibility TEXT,
      s1_nta DOUBLE PRECISION,
      s2_nta DOUBLE PRECISION,
      best_nta DOUBLE PRECISION,
      crl INTEGER,
      cat_rank INTEGER,
      s1_physics DOUBLE PRECISION,
      s1_chemistry DOUBLE PRECISION,
      s1_maths DOUBLE PRECISION,
      s2_physics DOUBLE PRECISION,
      s2_chemistry DOUBLE PRECISION,
      s2_maths DOUBLE PRECISION,
      dob TEXT,
      gender TEXT,
      adv_cutoff_cat DOUBLE PRECISION,
      advanced_qualified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS prediction_run (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES student_mapping(user_id),
      run_at TIMESTAMP DEFAULT NOW(),
      bucket TEXT NOT NULL,
      institute_name TEXT NOT NULL,
      institute_type TEXT NOT NULL,
      branch_name TEXT NOT NULL,
      quota TEXT,
      category TEXT,
      gender TEXT,
      opening_rank INTEGER,
      closing_rank INTEGER,
      closing_rank_median INTEGER,
      admit_prob DOUBLE PRECISION
    );

    CREATE TABLE IF NOT EXISTS josaa_cutoffs (
      id SERIAL PRIMARY KEY,
      year INTEGER NOT NULL,
      round INTEGER NOT NULL,
      institute_code TEXT,
      institute_name TEXT NOT NULL,
      institute_type TEXT NOT NULL,
      branch_code TEXT,
      branch_name TEXT NOT NULL,
      quota TEXT NOT NULL,
      category TEXT NOT NULL,
      gender TEXT NOT NULL DEFAULT 'Gender-Neutral',
      opening_rank INTEGER,
      closing_rank INTEGER
    );

    CREATE TABLE IF NOT EXISTS admin_user (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'bu_head',
      bu_scope TEXT,
      region_scope TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_mapping_mobile ON student_mapping(mobile);
    CREATE INDEX IF NOT EXISTS idx_result_best_nta ON scorecard_result(best_nta);
    CREATE INDEX IF NOT EXISTS idx_result_crl ON scorecard_result(crl);
    CREATE INDEX IF NOT EXISTS idx_josaa_lookup ON josaa_cutoffs(institute_name, branch_name, category, quota, gender, round);
  `;

  const stmts = statements.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of stmts) {
    await getPool().query(stmt);
  }
}
