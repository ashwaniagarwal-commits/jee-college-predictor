const { Pool } = require('pg');
const pool = new Pool({
  host: 'jee-predictor-instance-1.cvki64cwid8h.ap-south-1.rds.amazonaws.com',
  port: 5432,
  user: 'jee2026',
  password: 'ResultCollection2026',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});
pool.query('ALTER TABLE scorecard_result ADD COLUMN IF NOT EXISTS state_of_eligibility TEXT;')
  .then(function() { console.log('Column added successfully!'); pool.end(); })
  .catch(function(e) { console.error(e); pool.end(); });
