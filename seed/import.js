/**
 * 题库导入脚本
 * 用法: node seed/import.js [json文件路径]
 * 默认: seed/questions.json
 */
const path = require('path');
const fs = require('fs');
const { initDb } = require('../db/init');

const db = initDb();
const filePath = process.argv[2] || path.join(__dirname, 'questions.json');

if (!fs.existsSync(filePath)) {
  console.error(`❌ 找不到题库文件: ${filePath}`);
  console.log('请将你的题库按格式放入 seed/questions.json');
  process.exit(1);
}

// 检查题库是否已存在
const existingCount = db.prepare('SELECT COUNT(*) as c FROM questions').get().c;
if (existingCount > 0) {
  console.log(`📚 题库已有 ${existingCount} 道题，跳过导入`);
  db.close();
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

// 支持多种格式
const questions = data.questions || data;

if (!Array.isArray(questions) || questions.length === 0) {
  console.error('❌ 题库为空或格式不正确');
  console.log('格式要求:');
  console.log(JSON.stringify([{
    exam_type: "1",
    section: "Section A",
    question_text: "题目内容",
    options: ["选项A", "选项B", "选项C", "选项D"],
    correct_index: 0,
    knowledge_point: "知识点名称",
    explanation: "详细讲解内容"
  }], null, 2));
  process.exit(1);
}

// 验证每个题目
let valid = 0;
let invalid = 0;
const insert = db.prepare(`
  INSERT INTO questions (exam_type, section, question_text, options, correct_index, knowledge_point, explanation)
  VALUES (@exam_type, @section, @question_text, @options, @correct_index, @knowledge_point, @explanation)
`);

const insertMany = db.transaction((items) => {
  for (const q of items) {
    if (!q.exam_type || !q.question_text || !q.options || q.correct_index === undefined) {
      console.log(`⚠️ 跳过无效题目: ${q.question_text?.slice(0, 30)}`);
      invalid++;
      continue;
    }
    insert.run({
      exam_type: String(q.exam_type),
      section: q.section || '',
      question_text: q.question_text,
      options: JSON.stringify(q.options),
      correct_index: q.correct_index,
      knowledge_point: q.knowledge_point || '',
      explanation: q.explanation || ''
    });
    valid++;
  }
});

insertMany(questions);

console.log(`✅ 导入完成: 成功 ${valid} 题, 跳过 ${invalid} 题`);
console.log(`📊 题库统计:`);
const stats = db.prepare('SELECT exam_type, COUNT(*) as count FROM questions GROUP BY exam_type').all();
stats.forEach(s => console.log(`   考试 ${s.exam_type}: ${s.count} 题`));

db.close();
