// 📁 db.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgresql://master_4lcu_user:azhrIZSnUReYz3HSbjztKTy1sMtsiNnu@dpg-cvetc59opnds73ein3v0-a.oregon-postgres.render.com/master_4lcu",
  ssl: { rejectUnauthorized: false },
});

module.exports = pool;
