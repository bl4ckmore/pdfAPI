// db.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://master_4lcu_user:azhrIZSnUReYz3HSbjztKTy1sMtsiNnu@dpg-cvetc59opnds73ein3v0-a.oregon-postgres.render.com/master_4lcu",
  ssl: { rejectUnauthorized: false },
});

// ✅ Test Connection on Startup
pool.connect()
  .then(() => console.log("✅ PostgreSQL connected successfully!"))
  .catch((err) => console.error("❌ PostgreSQL connection failed:", err));

module.exports = pool;
