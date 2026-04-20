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
    const columns = [
      'state_of_eligibility TEXT',
      's1_physics DOUBLE PRECISION',
      's1_chemistry DOUBLE PRECISION',
      's1_maths DOUBLE PRECISION',
      's2_physics DOUBLE PRECISION',
      's2_chemistry DOUBLE PRECISION',
      's2_maths DOUBLE PRECISION',
      'dob TEXT',
      'gender TEXT',
    ];
    for (const col of columns) {
      const name = col.split(' ')[0];
      await pool.query(`ALTER TABLE scorecard_result ADD COLUMN IF NOT EXISTS ${col};`);
      console.log('Added: ' + name);
    }
    console.log('All columns added successfully!');
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();
