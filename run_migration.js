const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function run() {
  const cleanUrl = process.env.DATABASE_URL.replace("?pgbouncer=true&sslmode=require", "");
  
  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  });

  const sqlPath = path.join(__dirname, "prisma/migrations/20260310222251_init/migration.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  try {
    console.log("Running migration...");
    await pool.query(sql);
    console.log("Migration executed successfully!");
  } catch (error) {
    if (error.code === '42P07') {
      console.log("Tables already exist.");
    } else {
      console.error("Migration error:", error);
    }
  } finally {
    pool.end();
  }
}

run();
