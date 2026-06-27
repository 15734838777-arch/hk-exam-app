// API 封装
const API = {
  base: '/api',

  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(this.base + path, opts);
    return res.json();
  },

  // 注册
  register() {
    return this.request('POST', '/register');
  },

  // 登录
  login(login_code) {
    return this.request('POST', '/login', { login_code });
  },

  // 获取某科全部题目（不含答案）
  getQuestions(exam_type) {
    return this.request('GET', `/questions/${exam_type}`);
  },

  // 获取单题详情（含讲解）
  getQuestion(id) {
    return this.request('GET', `/question/${id}`);
  },

  // 提交答案
  submitAnswer(user_id, question_id, selected_index) {
    return this.request('POST', '/answer', { user_id, question_id, selected_index });
  },

  // 获取错题
  getWrongQuestions(user_id) {
    return this.request('GET', `/user/${user_id}/wrong`);
  },

  // 获取某科进度
  getProgress(user_id, exam_type) {
    return this.request('GET', `/user/${user_id}/progress/${exam_type}`);
  },

  // 获取总体统计
  getStats(user_id) {
    return this.request('GET', `/user/${user_id}/stats`);
  },

  // 错题统计
  getWrongStats(user_id) {
    return this.request('GET', `/user/${user_id}/wrong/stats`);
  },

  // 重置答题记录
  resetAnswers(user_id) {
    return this.request('POST', `/user/${user_id}/reset`);
  },

  // 获取用户未答的题目（按上次进度继续）
  getUnansweredQuestions(user_id, exam_type) {
    return this.request('GET', `/user/${user_id}/questions/${exam_type}`);
  }
};
