const { Pool } = require('pg');
const pool = new Pool({
  host: 'jee-predictor-instance-1.cvki64cwid8h.ap-south-1.rds.amazonaws.com',
  port: 5432,
  user: 'jee2026',
  password: 'ResultCollection2026',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query('ALTER TABLE scorecard_result ADD COLUMN IF NOT EXISTS state_of_eligibility TEXT;');
    console.log('Added: state_of_eligibility');
    await pool.query('ALTER TABLE scorecard_result ADD COLUMN IF NOT EXISTS pcm_nta DOUBLE PRECISION;');
    console.log('Added: pcm_nta');
    await pool.query('ALTER TABLE scorecard_result ADD COLUMN IF NOT EXISTS dob TEXT;');
    console.log('Added: dob');
    await pool.query('ALTER TABLE scorecard_result ADD COLUMN IF NOT EXISTS gender TEXT;');
    console.log('Added: gender');
    console.log('All columns added successfully!');
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();
