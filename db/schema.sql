-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login_code TEXT UNIQUE NOT NULL,
  nickname TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now', '+8 hours'))
);

-- 题库
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_type TEXT NOT NULL CHECK(exam_type IN ('1', '3')),
  section TEXT DEFAULT '',
  question_text TEXT NOT NULL,
  options TEXT NOT NULL,   -- JSON array: ["选项A","选项B","选项C","选项D"]
  correct_index INTEGER NOT NULL,
  knowledge_point TEXT NOT NULL,
  explanation TEXT NOT NULL
);

-- 答题记录
CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  selected_index INTEGER,  -- 用户选的答案索引, NULL表示跳过/没答
  is_correct INTEGER NOT NULL DEFAULT 0,
  answered_at TEXT DEFAULT (datetime('now', '+8 hours')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_answers_user ON answers(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_user_q ON answers(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(exam_type);
