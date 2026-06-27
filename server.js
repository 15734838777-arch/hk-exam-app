const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { initDb, getDb } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 初始化数据库
let db;
try {
  db = initDb();
} catch (e) {
  console.error('❌ 数据库初始化失败:', e.message);
  process.exit(1);
}

// ==================== 用户系统 ====================

// 生成随机登录代号: 6位大写字母+数字，好记
function generateLoginCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆的 I O 0 1
  let code;
  let existing;
  let attempts = 0;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    // 检查是否已存在
    existing = db.prepare('SELECT id FROM users WHERE login_code = ?').get(code);
    attempts++;
    if (attempts > 100) {
      // 极端情况：用 UUID 片段兜底
      code = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
      break;
    }
  } while (existing);
  return code;
}

// POST /api/register - 创建新用户，返回登录代号
app.post('/api/register', (req, res) => {
  try {
    const code = generateLoginCode();
    const result = db.prepare('INSERT INTO users (login_code, last_active) VALUES (?, datetime(\'now\', \'+8 hours\'))').run(code);
    res.json({ success: true, login_code: code, user_id: result.lastInsertRowid });
  } catch (e) {
    console.error('注册错误:', e.message);
    res.status(500).json({ success: false, message: '创建用户失败: ' + e.message });
  }
});

// POST /api/login - 用代号登录
app.post('/api/login', (req, res) => {
  const { login_code } = req.body;
  if (!login_code) {
    return res.status(400).json({ success: false, message: '请输入登录代号' });
  }
  const user = db.prepare('SELECT id, login_code, nickname, created_at, last_active FROM users WHERE login_code = ?').get(login_code.toUpperCase());
  if (!user) {
    return res.status(404).json({ success: false, message: '登录代号不存在，请检查或重新注册' });
  }
  // 更新活跃时间
  db.prepare("UPDATE users SET last_active = datetime('now', '+8 hours') WHERE id = ?").run(user.id);
  user.last_active = new Date().toISOString();
  res.json({ success: true, user });
});

// ==================== 题库 ====================

// GET /api/questions/:exam_type - 获取某科全部题目
app.get('/api/questions/:exam_type', (req, res) => {
  const { exam_type } = req.params;
  if (!['1', '3'].includes(exam_type)) {
    return res.status(400).json({ success: false, message: '考试类型只能是 1 或 3' });
  }
  const questions = db.prepare(
    'SELECT id, exam_type, section, question_text, options, knowledge_point FROM questions WHERE exam_type = ? ORDER BY id'
  ).all(exam_type);

  // 解析 options JSON
  const parsed = questions.map(q => ({
    ...q,
    options: JSON.parse(q.options)
  }));
  res.json({ success: true, count: parsed.length, questions: parsed });
});

// GET /api/question/:id - 获取单题（含知识点讲解）
app.get('/api/question/:id', (req, res) => {
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!q) {
    return res.status(404).json({ success: false, message: '题目不存在' });
  }
  q.options = JSON.parse(q.options);
  res.json({ success: true, question: q });
});

// ==================== 答题记录 ====================

// POST /api/answer - 提交答案
app.post('/api/answer', (req, res) => {
  const { user_id, question_id, selected_index } = req.body;
  if (!user_id || !question_id) {
    return res.status(400).json({ success: false, message: '缺少参数' });
  }

  // 获取正确答案
  const q = db.prepare('SELECT correct_index, explanation, knowledge_point FROM questions WHERE id = ?').get(question_id);
  if (!q) {
    return res.status(404).json({ success: false, message: '题目不存在' });
  }

  const is_correct = (selected_index === q.correct_index) ? 1 : 0;

  // 检查是否已经答过这道题，如果答过就更新
  const existing = db.prepare('SELECT id FROM answers WHERE user_id = ? AND question_id = ?').get(user_id, question_id);
  if (existing) {
    db.prepare('UPDATE answers SET selected_index = ?, is_correct = ?, answered_at = datetime(\'now\', \'+8 hours\') WHERE id = ?')
      .run(selected_index, is_correct, existing.id);
  } else {
    db.prepare('INSERT INTO answers (user_id, question_id, selected_index, is_correct) VALUES (?, ?, ?, ?)')
      .run(user_id, question_id, selected_index, is_correct);
  }

  // 更新用户活跃时间
  db.prepare("UPDATE users SET last_active = datetime('now', '+8 hours') WHERE id = ?").run(user_id);

  res.json({
    success: true,
    is_correct: !!is_correct,
    correct_index: q.correct_index,
    knowledge_point: q.knowledge_point,
    explanation: q.explanation
  });
});

// POST /api/user/:user_id/reset - 重置答题记录
app.post('/api/user/:user_id/reset', (req, res) => {
  const { user_id } = req.params;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }
  db.prepare('DELETE FROM answers WHERE user_id = ?').run(user_id);
  db.prepare("UPDATE users SET last_active = datetime('now', '+8 hours') WHERE id = ?").run(user_id);
  res.json({ success: true, message: '答题记录已清空，可以重新开始了' });
});

// GET /api/cleanup - 清理3天未活跃的用户（管理员用或定时任务触发）
app.get('/api/cleanup', (req, res) => {
  const deleted = db.prepare(`
    DELETE FROM users
    WHERE last_active < datetime('now', '-3 days', '+8 hours')
  `).run();
  console.log(`🧹 清理了 ${deleted.changes} 个不活跃用户`);
  res.json({ success: true, deleted: deleted.changes });
});

// 定时清理：每30分钟检查一次
setInterval(() => {
  const deleted = db.prepare(`
    DELETE FROM users
    WHERE last_active < datetime('now', '-3 days', '+8 hours')
  `).run();
  if (deleted.changes > 0) {
    console.log(`🧹 定时清理: 删除了 ${deleted.changes} 个超过3天未活跃的用户`);
  }
}, 30 * 60 * 1000);

// GET /api/user/:user_id/wrong - 获取用户错题
app.get('/api/user/:user_id/wrong', (req, res) => {
  const { user_id } = req.params;
  const wrong = db.prepare(`
    SELECT q.id, q.exam_type, q.section, q.question_text, q.options, q.correct_index, q.knowledge_point, q.explanation,
           a.selected_index, a.answered_at
    FROM questions q
    JOIN answers a ON q.id = a.question_id
    WHERE a.user_id = ? AND a.is_correct = 0
    ORDER BY a.answered_at DESC
  `).all(user_id);

  const parsed = wrong.map(w => ({
    ...w,
    options: JSON.parse(w.options)
  }));

  res.json({ success: true, count: parsed.length, questions: parsed });
});

// GET /api/user/:user_id/progress/:exam_type - 获取用户某科刷题进度
app.get('/api/user/:user_id/progress/:exam_type', (req, res) => {
  const { user_id, exam_type } = req.params;

  const total = db.prepare('SELECT COUNT(*) as count FROM questions WHERE exam_type = ?').get(exam_type).count;
  const answered = db.prepare(`
    SELECT COUNT(*) as count FROM answers a
    JOIN questions q ON a.question_id = q.id
    WHERE a.user_id = ? AND q.exam_type = ?
  `).get(user_id, exam_type).count;
  const correct = db.prepare(`
    SELECT COUNT(*) as count FROM answers a
    JOIN questions q ON a.question_id = q.id
    WHERE a.user_id = ? AND q.exam_type = ? AND a.is_correct = 1
  `).get(user_id, exam_type).count;

  res.json({
    success: true,
    total,
    answered,
    correct,
    wrong: answered - correct,
    accuracy: answered > 0 ? Math.round(correct / answered * 100) : 0
  });
});

// GET /api/user/:user_id/wrong/stats - 错题统计
app.get('/api/user/:user_id/wrong/stats', (req, res) => {
  const { user_id } = req.params;
  const byExam = db.prepare(`
    SELECT q.exam_type, COUNT(*) as count
    FROM answers a
    JOIN questions q ON a.question_id = q.id
    WHERE a.user_id = ? AND a.is_correct = 0
    GROUP BY q.exam_type
  `).all(user_id);

  res.json({ success: true, by_exam: byExam });
});

// GET /api/user/:user_id/stats - 用户总体统计
app.get('/api/user/:user_id/stats', (req, res) => {
  const { user_id } = req.params;
  const stats = db.prepare(`
    SELECT
      q.exam_type,
      COUNT(*) as total_q,
      SUM(CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END) as answered,
      SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) as correct,
      SUM(CASE WHEN a.is_correct = 0 THEN 1 ELSE 0 END) as wrong
    FROM questions q
    LEFT JOIN answers a ON q.id = a.question_id AND a.user_id = ?
    GROUP BY q.exam_type
  `).all(user_id);

  res.json({ success: true, stats });
});

// ==================== 启动 ====================
app.listen(PORT, () => {
  console.log(`🔮 香港保险牌照刷题系统已启动`);
  console.log(`   http://localhost:${PORT}`);
});
