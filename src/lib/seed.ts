import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local before anything else
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { getPool, initDb, execute, query } from './db';
import { v4 as uuidv4 } from 'uuid';

const INSTITUTES = [
  {
    name: 'IIT Bombay', type: 'IIT',
    branches: [
      { name: 'Computer Science and Engineering', baseClosingRank: 70 },
      { name: 'Electronics and Communication Engineering', baseClosingRank: 600 },
      { name: 'Mechanical Engineering', baseClosingRank: 3500 },
      { name: 'Electrical Engineering', baseClosingRank: 950 },
      { name: 'Civil Engineering', baseClosingRank: 6000 },
    ],
  },
  {
    name: 'IIT Delhi', type: 'IIT',
    branches: [
      { name: 'Computer Science and Engineering', baseClosingRank: 90 },
      { name: 'Electronics and Communication Engineering', baseClosingRank: 700 },
      { name: 'Mechanical Engineering', baseClosingRank: 4000 },
      { name: 'Electrical Engineering', baseClosingRank: 1050 },
    ],
  },
  {
    name: 'IIT Madras', type: 'IIT',
    branches: [
      { name: 'Computer Science and Engineering', baseClosingRank: 85 },
      { name: 'Electronics and Communication Engineering', baseClosingRank: 650 },
      { name: 'Mechanical Engineering', baseClosingRank: 3800 },
      { name: 'Electrical Engineering', baseClosingRank: 1000 },
    ],
  },
  {
    name: 'IIT Kanpur', type: 'IIT',
    branches: [
      { name: 'Computer Science and Engineering', baseClosingRank: 95 },
      { name: 'Electronics and Communication Engineering', baseClosingRank: 750 },
      { name: 'Mechanical Engineering', baseClosingRank: 4100 },
      { name: 'Electrical Engineering', baseClosingRank: 1100 },
    ],
  },
  {
    name: 'IIT Kharagpur', type: 'IIT',
    branches: [
      { name: 'Computer Science and Engineering', baseClosingRank: 100 },
      { name: 'Electronics and Communication Engineering', baseClosingRank: 800 },
      { name: 'Mechanical Engineering', baseClosingRank: 4200 },
      { name: 'Electrical Engineering', baseClosingRank: 1150 },
      { name: 'Civil Engineering', baseClosingRank: 6500 },
    ],
  },
  {
    name: 'IIT Roorkee', type: 'IIT',
    branches: [
      { name: 'Computer Science and Engineering', baseClosingRank: 110 },
      { name: 'Electronics and Communication Engineering', baseClosingRank: 850 },
      { name: 'Mechanical Engineering', baseClosingRank: 4300 },
      { name: 'Electrical Engineering', baseClosingRank: 1200 },
    ],
  },
  {
    name: 'IIT Guwahati', type: 'IIT',
    branches: [
      { name: 'Computer Science and Engineering', baseClosingRank: 200 },
      { name: 'Electronics and Communication Engineering', baseClosingRank: 1200 },
      { name: 'Mechanical Engineering', baseClosingRank: 5000 },
    ],
  },
  {
    name: 'IIT Hyderabad', type: 'IIT',
    branches: [
      { name: 'Computer Science and Engineering', baseClosingRank: 180 },
      { name: 'Electronics and Communication Engineering', baseClosingRank: 1100 },
      { name: 'Mechanical Engineering', baseClosingRank: 4800 },
    ],
  },
  {
    name: 'NIT Trichy', type: 'NIT',
    branches: [
      { name: 'Computer Science and Engineering', baseClosingRank: 6000 },
      { name: 'Electronics and Communication Engineering', baseClosingRank: 12000 },
      { name: 'Mechanical Engineering', baseClosingRank: 18000 },
      { name: 'Electrical Engineering', baseClosingRank: 14000 },
      { name: 'Civil Engineering', baseClosingRank: 22000 },
    ],
  },
  {
    name: 'NIT Warangal', type: 'NIT',
    branches: [
      { name: 'Computer Science and Engineering', baseClosingRank: 7500 },
      { name: 'Electronics and Communication Engineering', baseClosingRank: 14000 },
      { name: 'Mechanical Engineering', baseClosingRank: 20000 },
    ],
  },
  {
    name: 'NIT Surathkal', type: 'NIT',
    branches: [
      { name: 'Computer Science and Engineering', baseClosingRank: 7000 },
      { name: 'Electronics and Communication Engineering', baseClosingRank: 13000 },
      { name: 'Mechanical Engineering', baseClosingRank: 19000 },
    ],
  },
  {
    name: 'NIT Calicut', type: 'NIT',
    branches: [
      { name: 'Computer Science and Engineering', baseClosingRank: 8000 },
      { name: 'Electronics and Communication Engineering', baseClosingRank: 15000 },
    ],
  },
  {
    name: 'NIT Allahabad', type: 'NIT',
    branches: [
      { name: 'Computer Science and Engineering', baseClosingRank: 8500 },
      { name: 'Electronics and Communication Engineering', baseClosingRank: 16000 },
    ],
  },
  {
    name: 'IIIT Hyderabad', type: 'IIIT',
    branches: [
      { name: 'Computer Science and Engineering', baseClosingRank: 2800 },
      { name: 'Electronics and Communication Engineering', baseClosingRank: 8000 },
    ],
  },
  {
    name: 'IIIT Bangalore', type: 'IIIT',
    branches: [
      { name: 'Computer Science and Engineering', baseClosingRank: 2600 },
      { name: 'Electronics and Communication Engineering', baseClosingRank: 7500 },
    ],
  },
  {
    name: 'IIIT Allahabad', type: 'IIIT',
    branches: [
      { name: 'Computer Science and Engineering', baseClosingRank: 3200 },
      { name: 'Electronics and Communication Engineering', baseClosingRank: 9000 },
      { name: 'Information Technology', baseClosingRank: 3500 },
    ],
  },
];

const CATEGORIES = ['OPEN', 'OBC-NCL', 'SC', 'ST', 'EWS'];
const BUS = ['JEE-2Y', 'JEE-1Y', 'JEE-DROPPER', 'TATVA'];
const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
const STATES = ['Delhi', 'Maharashtra', 'Karnataka', 'Telangana', 'Tamil Nadu', 'West Bengal', 'Rajasthan', 'Gujarat', 'Punjab', 'Uttar Pradesh'];

function variedRank(base: number): number {
  const variation = Math.floor(base * 0.1 * (Math.random() * 2 - 1));
  return Math.max(1, base + variation);
}

async function seed() {
  console.log('Initializing database tables...');
  await initDb();

  const pool = getPool();

  // Clear existing data
  console.log('Clearing existing seed data...');
  await pool.query('DELETE FROM prediction_run');
  await pool.query('DELETE FROM josaa_cutoffs');
  await pool.query('DELETE FROM scorecard_result');
  await pool.query('DELETE FROM scorecard_upload');
  await pool.query('DELETE FROM student_mapping');
  await pool.query('DELETE FROM admin_user');

  // Seed JOSAA cutoffs
  console.log('Seeding JOSAA cutoffs...');
  let cutoffCount = 0;
  for (const inst of INSTITUTES) {
    for (const branch of inst.branches) {
      for (const year of [2023, 2024, 2025]) {
        for (const cat of CATEGORIES) {
          const closing = variedRank(branch.baseClosingRank);
          const opening = Math.ceil(closing * 0.7);
          await execute(
            `INSERT INTO josaa_cutoffs (year, round, institute_name, institute_type, branch_name, quota, category, gender, opening_rank, closing_rank)
             VALUES ($1, 6, $2, $3, $4, 'AI', $5, 'Gender-Neutral', $6, $7)`,
            [year, inst.name, inst.type, branch.name, cat, opening, closing]
          );
          cutoffCount++;
        }
      }
    }
  }
  console.log(`Inserted ${cutoffCount} JOSAA cutoff records`);

  // Seed students
  console.log('Seeding student mapping...');
  for (let i = 1; i <= 20; i++) {
    const mobile = `987654${String(3000 + i).padStart(4, '0')}`;
    await execute(
      `INSERT INTO student_mapping (user_id, mobile, student_name, bu, region, category, home_state)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        uuidv4(), mobile, `Student ${i}`,
        BUS[i % BUS.length], REGIONS[i % REGIONS.length],
        CATEGORIES[i % CATEGORIES.length], STATES[i % STATES.length],
      ]
    );
  }
  console.log('Inserted 20 student mapping records');

  // Seed admin
  console.log('Seeding admin user...');
  await execute(
    `INSERT INTO admin_user (id, email, name, role) VALUES ($1, $2, $3, $4)`,
    [uuidv4(), 'ashwani.agarwal@vedantu.com', 'Ashwin', 'super_admin']
  );
  console.log('Inserted 1 admin user');

  console.log('\n✓ Database seeding complete!');
  console.log(`  - JOSAA Cutoffs: ${cutoffCount} records`);
  console.log(`  - Student Mapping: 20 records`);
  console.log(`  - Admin Users: 1 record`);

  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
