const { Pool } = require("pg");
const pool = new Pool({
  connectionString: "postgresql://postgres.fkyfejkkzfjwncusvugy:2021114049diego@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
});
pool.query("SELECT * FROM information_schema.tables WHERE table_schema='public';", (err, res) => {
  if (err) console.error(err);
  else {
    console.log("Tables found:", res.rows.map(r => r.table_name));
    process.exit(0);
  }
});
