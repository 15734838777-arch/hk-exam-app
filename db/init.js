const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 使用环境变量 DB_PATH 实现持久化存储（Railway Volume）
// 默认存项目目录下
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'exam.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;

function getDb() {
  if (db) return db;
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function initDb() {
  const d = getDb();
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  d.exec(sql);
  // 兼容旧数据库：补上 last_active 列
  try { d.exec('ALTER TABLE users ADD COLUMN last_active TEXT DEFAULT (datetime(\'now\', \'+8 hours\'))'); } catch(e) {}
  console.log('✅ 数据库初始化完成');
  return d;
}

module.exports = { getDb, initDb };
