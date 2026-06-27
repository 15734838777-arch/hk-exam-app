const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'exam.db');
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
  console.log('✅ 数据库初始化完成');
  return d;
}

module.exports = { getDb, initDb };
