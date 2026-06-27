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

  // 兼容旧数据库：检查并补上 last_active 列
  const cols = d.prepare("PRAGMA table_info('users')").all();
  const hasLastActive = cols.some(c => c.name === 'last_active');
  if (!hasLastActive) {
    console.log('🔄 检测到旧数据库，正在升级 schema...');
    d.exec("ALTER TABLE users ADD COLUMN last_active TEXT");
    d.exec("UPDATE users SET last_active = created_at WHERE last_active IS NULL");
    console.log('✅ 数据库升级完成');
  }

  console.log('✅ 数据库初始化完成');
  return d;
}

module.exports = { getDb, initDb };
