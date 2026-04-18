import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local before anything else
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { getPool, initDb, execute, query } from './db';
import { v4 as uuidv4 } from 'uuid';

// Define all institutes with their CSE baseline closing ranks
const INSTITUTES = [
  // IITs (23)
  { name: 'IIT Bombay', type: 'IIT', cseClosing: 70 },
  { name: 'IIT Delhi', type: 'IIT', cseClosing: 100 },
  { name: 'IIT Madras', type: 'IIT', cseClosing: 120 },
  { name: 'IIT Kanpur', type: 'IIT', cseClosing: 150 },
  { name: 'IIT Kharagpur', type: 'IIT', cseClosing: 400 },
  { name: 'IIT Roorkee', type: 'IIT', cseClosing: 600 },
  { name: 'IIT Guwahati', type: 'IIT', cseClosing: 800 },
  { name: 'IIT Hyderabad', type: 'IIT', cseClosing: 900 },
  { name: 'IIT BHU', type: 'IIT', cseClosing: 1500 },
  { name: 'IIT ISM Dhanbad', type: 'IIT', cseClosing: 2500 },
  { name: 'IIT Indore', type: 'IIT', cseClosing: 2000 },
  { name: 'IIT Ropar', type: 'IIT', cseClosing: 2200 },
  { name: 'IIT Patna', type: 'IIT', cseClosing: 3000 },
  { name: 'IIT Gandhinagar', type: 'IIT', cseClosing: 2500 },
  { name: 'IIT Mandi', type: 'IIT', cseClosing: 3500 },
  { name: 'IIT Jodhpur', type: 'IIT', cseClosing: 3000 },
  { name: 'IIT Tirupati', type: 'IIT', cseClosing: 4000 },
  { name: 'IIT Palakkad', type: 'IIT', cseClosing: 4500 },
  { name: 'IIT Dharwad', type: 'IIT', cseClosing: 4500 },
  { name: 'IIT Jammu', type: 'IIT', cseClosing: 5000 },
  { name: 'IIT Bhilai', type: 'IIT', cseClosing: 5000 },
  { name: 'IIT Goa', type: 'IIT', cseClosing: 5500 },
  { name: 'IIT BBS', type: 'IIT', cseClosing: 5000 },

  // NITs (31)
  { name: 'NIT Trichy', type: 'NIT', cseClosing: 3000 },
  { name: 'NIT Surathkal', type: 'NIT', cseClosing: 4000 },
  { name: 'NIT Warangal', type: 'NIT', cseClosing: 4500 },
  { name: 'NIT Calicut', type: 'NIT', cseClosing: 6000 },
  { name: 'NIT Allahabad', type: 'NIT', cseClosing: 7000 },
  { name: 'NIT Rourkela', type: 'NIT', cseClosing: 5500 },
  { name: 'NIT Jaipur', type: 'NIT', cseClosing: 8000 },
  { name: 'NIT Nagpur', type: 'NIT', cseClosing: 9000 },
  { name: 'NIT Kurukshetra', type: 'NIT', cseClosing: 10000 },
  { name: 'NIT Durgapur', type: 'NIT', cseClosing: 8000 },
  { name: 'NIT Silchar', type: 'NIT', cseClosing: 12000 },
  { name: 'NIT Hamirpur', type: 'NIT', cseClosing: 15000 },
  { name: 'NIT Srinagar', type: 'NIT', cseClosing: 20000 },
  { name: 'NIT Agartala', type: 'NIT', cseClosing: 25000 },
  { name: 'NIT Manipur', type: 'NIT', cseClosing: 30000 },
  { name: 'NIT Meghalaya', type: 'NIT', cseClosing: 30000 },
  { name: 'NIT Mizoram', type: 'NIT', cseClosing: 35000 },
  { name: 'NIT Nagaland', type: 'NIT', cseClosing: 35000 },
  { name: 'NIT Sikkim', type: 'NIT', cseClosing: 30000 },
  { name: 'NIT Arunachal Pradesh', type: 'NIT', cseClosing: 35000 },
  { name: 'MNIT Jaipur', type: 'NIT', cseClosing: 7000 },
  { name: 'MNNIT Allahabad', type: 'NIT', cseClosing: 7000 },
  { name: 'VNIT Nagpur', type: 'NIT', cseClosing: 6000 },
  { name: 'SVNIT Surat', type: 'NIT', cseClosing: 8000 },
  { name: 'NIT Raipur', type: 'NIT', cseClosing: 12000 },
  { name: 'NIT Patna', type: 'NIT', cseClosing: 10000 },
  { name: 'NIT Uttarakhand', type: 'NIT', cseClosing: 15000 },
  { name: 'NIT Goa', type: 'NIT', cseClosing: 12000 },
  { name: 'NIT Puducherry', type: 'NIT', cseClosing: 15000 },
  { name: 'NIT Delhi', type: 'NIT', cseClosing: 5000 },
  { name: 'NIT Andhra Pradesh', type: 'NIT', cseClosing: 15000 },

  // IIITs (26)
  { name: 'IIIT Hyderabad', type: 'IIIT', cseClosing: 1500 },
  { name: 'IIIT Allahabad', type: 'IIIT', cseClosing: 3000 },
  { name: 'IIIT Delhi', type: 'IIIT', cseClosing: 2500 },
  { name: 'IIIT Bangalore', type: 'IIIT', cseClosing: 3000 },
  { name: 'IIIT Lucknow', type: 'IIIT', cseClosing: 8000 },
  { name: 'IIIT Gwalior', type: 'IIIT', cseClosing: 7000 },
  { name: 'IIIT Kota', type: 'IIIT', cseClosing: 10000 },
  { name: 'IIIT Una', type: 'IIIT', cseClosing: 12000 },
  { name: 'IIIT Sonepat', type: 'IIIT', cseClosing: 11000 },
  { name: 'IIIT Kalyani', type: 'IIIT', cseClosing: 15000 },
  { name: 'IIIT Sri City', type: 'IIIT', cseClosing: 10000 },
  { name: 'IIIT Vadodara', type: 'IIIT', cseClosing: 12000 },
  { name: 'IIIT Ranchi', type: 'IIIT', cseClosing: 15000 },
  { name: 'IIIT Nagpur', type: 'IIIT', cseClosing: 12000 },
  { name: 'IIIT Pune', type: 'IIIT', cseClosing: 10000 },
  { name: 'IIIT Kancheepuram', type: 'IIIT', cseClosing: 10000 },
  { name: 'IIIT Dharwad', type: 'IIIT', cseClosing: 12000 },
  { name: 'IIIT Manipur', type: 'IIIT', cseClosing: 20000 },
  { name: 'IIIT Tiruchirappalli', type: 'IIIT', cseClosing: 12000 },
  { name: 'IIIT Bhagalpur', type: 'IIIT', cseClosing: 15000 },
  { name: 'IIIT Bhopal', type: 'IIIT', cseClosing: 12000 },
  { name: 'IIIT Surat', type: 'IIIT', cseClosing: 10000 },
  { name: 'IIIT Jabalpur', type: 'IIIT', cseClosing: 15000 },
  { name: 'IIIT Kottayam', type: 'IIIT', cseClosing: 12000 },
  { name: 'IIIT Agartala', type: 'IIIT', cseClosing: 20000 },
  { name: 'IIIT Raichur', type: 'IIIT', cseClosing: 18000 },

  // GFTIs (15)
  { name: 'IIEST Shibpur', type: 'GFTI', cseClosing: 5000 },
  { name: 'BIT Mesra', type: 'GFTI', cseClosing: 10000 },
  { name: 'PEC Chandigarh', type: 'GFTI', cseClosing: 8000 },
  { name: 'DTU Delhi', type: 'GFTI', cseClosing: 3000 },
  { name: 'NSUT Delhi', type: 'GFTI', cseClosing: 3500 },
  { name: 'IIIT Guwahati', type: 'GFTI', cseClosing: 15000 },
  { name: 'NIT AP Tadepalligudem', type: 'GFTI', cseClosing: 15000 },
  { name: 'BIT Sindri', type: 'GFTI', cseClosing: 20000 },
  { name: 'GEC Thrissur', type: 'GFTI', cseClosing: 25000 },
  { name: 'Jamia Millia Islamia', type: 'GFTI', cseClosing: 12000 },
  { name: 'AMU', type: 'GFTI', cseClosing: 15000 },
  { name: 'BITS Pilani', type: 'GFTI', cseClosing: 8000 },
  { name: 'VIT Vellore', type: 'GFTI', cseClosing: 9000 },
  { name: 'Manipal Institute of Technology', type: 'GFTI', cseClosing: 10000 },
  { name: 'SRM Institute of Science and Technology', type: 'GFTI', cseClosing: 11000 },
];

// Branch configurations for each institute type
const BRANCH_CONFIGS = {
  IIT: [
    { name: 'Computer Science and Engineering', multiplier: 1.0 },
    { name: 'Electronics and Communication Engineering', multiplier: 2.5 },
    { name: 'Electrical Engineering', multiplier: 4.0 },
    { name: 'Mechanical Engineering', multiplier: 6.5 },
    { name: 'Civil Engineering', multiplier: 10.0 },
    { name: 'Chemical Engineering', multiplier: 12.0 },
    { name: 'Data Science and Artificial Intelligence', multiplier: 0.95 },
  ],
  NIT: [
    { name: 'Computer Science and Engineering', multiplier: 1.0 },
    { name: 'Electronics and Communication Engineering', multiplier: 2.3 },
    { name: 'Electrical Engineering', multiplier: 3.5 },
    { name: 'Mechanical Engineering', multiplier: 5.5 },
    { name: 'Civil Engineering', multiplier: 8.5 },
    { name: 'Chemical Engineering', multiplier: 10.0 },
  ],
  IIIT: [
    { name: 'Computer Science and Engineering', multiplier: 1.0 },
    { name: 'Electronics and Communication Engineering', multiplier: 2.0 },
    { name: 'Information Technology', multiplier: 1.1 },
  ],
  GFTI: [
    { name: 'Computer Science and Engineering', multiplier: 1.0 },
    { name: 'Electronics and Communication Engineering', multiplier: 2.2 },
    { name: 'Electrical Engineering', multiplier: 3.5 },
    { name: 'Mechanical Engineering', multiplier: 5.0 },
  ],
};

// Category rank multipliers relative to OPEN
const CATEGORY_MULTIPLIERS = {
  'OPEN': 1.0,
  'OBC-NCL': 2.5,
  'SC': 6.5,
  'ST': 12.0,
  'EWS': 2.0,
};

const CATEGORIES = ['OPEN', 'OBC-NCL', 'SC', 'ST', 'EWS'];
const YEARS = [2022, 2023, 2024];
const BUS = ['JEE-2Y', 'JEE-1Y', 'JEE-DROPPER', 'TATVA'];
const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
const STATES = ['Delhi', 'Maharashtra', 'Karnataka', 'Telangana', 'Tamil Nadu', 'West Bengal', 'Rajasthan', 'Gujarat', 'Punjab', 'Uttar Pradesh'];

function applyVariation(base: number, yearVariation: number): number {
  // Apply ±5-10% year-to-year variation
  const variation = base * (0.05 + Math.random() * 0.05) * (yearVariation < 2023 ? -1 : 1);
  return Math.max(1, Math.round(base + variation));
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

  for (const institute of INSTITUTES) {
    const branches = BRANCH_CONFIGS[institute.type as keyof typeof BRANCH_CONFIGS];

    for (const branch of branches) {
      for (const year of YEARS) {
        // Calculate base closing rank for this branch
        const baseBranchClosing = Math.round(institute.cseClosing * branch.multiplier);

        for (const category of CATEGORIES) {
          // Apply category multiplier
          const categoryClosing = Math.round(baseBranchClosing * CATEGORY_MULTIPLIERS[category as keyof typeof CATEGORY_MULTIPLIERS]);

          // Apply year variation
          const closingRank = applyVariation(categoryClosing, year);
          const openingRank = Math.ceil(closingRank * 0.7);

          try {
            await execute(
              `INSERT INTO josaa_cutoffs (year, round, institute_name, institute_type, branch_name, quota, category, gender, opening_rank, closing_rank)
               VALUES ($1, 6, $2, $3, $4, 'AI', $5, 'Gender-Neutral', $6, $7)`,
              [year, institute.name, institute.type, branch.name, category, openingRank, closingRank]
            );
            cutoffCount++;
          } catch (err) {
            console.error(`Error inserting cutoff for ${institute.name} - ${branch.name} - ${year} - ${category}:`, err);
          }
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

  // Calculate final stats
  const totalRecordsPerInstitute = branches => branches.length * YEARS.length * CATEGORIES.length;
  const totalInstituteRecords = INSTITUTES.reduce((sum, inst) => {
    const branches = BRANCH_CONFIGS[inst.type as keyof typeof BRANCH_CONFIGS];
    return sum + totalRecordsPerInstitute(branches);
  }, 0);

  console.log('\n✓ Database seeding complete!');
  console.log(`  - JOSAA Cutoffs: ${cutoffCount} records (IITs: 23, NITs: 31, IIITs: 26, GFTIs: 15 = 95 institutes)`);
  console.log(`  - Branches per institute: 3-7 branches`);
  console.log(`  - Years: 2022, 2023, 2024 (3 years)`);
  console.log(`  - Categories: 5 (OPEN, OBC-NCL, SC, ST, EWS)`);
  console.log(`  - Student Mapping: 20 records`);
  console.log(`  - Admin Users: 1 record`);
  console.log(`\nData generation parameters applied:`);
  console.log(`  - Category rank multipliers: OPEN(1.0x), OBC-NCL(2.5x), SC(6.5x), ST(12.0x), EWS(2.0x)`);
  console.log(`  - Branch multipliers: CSE(1.0x), ECE(2.0-2.5x), EE(3.5-4.0x), ME(5.0-6.5x), Civil(8.5-10.0x), Chemical(10.0-12.0x)`);
  console.log(`  - Year-to-year variation: ±5-10%`);

  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
