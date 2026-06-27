// ==================== 状态管理 ====================
const STATE = {
  user: null,               // 当前登录用户
  questions: [],            // 当前题目列表
  currentIndex: 0,          // 当前是第几题
  selectedOption: null,     // 当前选中的选项索引
  answered: false,          // 当前题是否已答
  examType: null,           // 当前考试类型 '1' | '3'
  wrongList: [],            // 错题列表
  reviewMode: false,        // 是否在复习模式
  reviewIndex: 0,           // 复习到第几题
};

// ==================== DOM 引用 ====================
const $ = id => document.getElementById(id);
const DOM = {
  // 页面
  loginPage: $('page-login'),
  mainPage: $('page-main'),

  // 登录
  loginView: $('login-view'),
  welcomeView: $('welcome-view'),
  loginCode: $('login-code'),
  loginBtn: $('btn-login'),
  registerBtn: $('btn-register'),
  newCode: $('new-code'),
  newCodeDisplay: $('new-code-display'),
  registerAgain: $('btn-register-again'),
  loginError: $('login-error'),

  // 主界面
  headerCode: $('header-code'),
  btnLogout: $('btn-logout'),
  tabExam: $('tab-exam'),
  tabWrong: $('tab-wrong'),
  tabStats: $('tab-stats'),
  pageExam: $('page-exam'),
  pageWrong: $('page-wrong'),
  pageStats: $('page-stats'),

  // 刷题
  examSelect: $('exam-select'),
  exam1Btn: $('exam-1-btn'),
  exam3Btn: $('exam-3-btn'),
  examArea: $('exam-area'),
  examHeader: $('exam-header'),
  examProgress: $('exam-progress'),
  examCount: $('exam-count'),
  questionText: $('question-text'),
  optionsContainer: $('options-container'),
  resultArea: $('result-area'),
  resultBadge: $('result-badge'),
  explanationBox: $('explanation-box'),
  kpText: $('kp-text'),
  explanationText: $('explanation-text'),
  btnPrev: $('btn-prev'),
  btnNext: $('btn-next'),
  btnReset: $('btn-reset-exam'),

  // 错题
  wrongList: $('wrong-list'),
  wrongReview: $('wrong-review'),
  wrongBack: $('wrong-back'),
  wrongQText: $('wrong-q-text'),
  wrongOptions: $('wrong-options'),
  wrongExplanation: $('wrong-explanation-box'),
  wrongKp: $('wrong-kp'),
  wrongExpText: $('wrong-exp-text'),
  wrongCorrect: $('wrong-correct'),
  wrongPrev: $('wrong-prev'),
  wrongNext: $('wrong-next'),
  wrongProgress: $('wrong-progress'),

  // 统计
  statsContent: $('stats-content'),
};

// ==================== 工具函数 ====================
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ==================== 登录逻辑 ====================

DOM.registerBtn.addEventListener('click', async () => {
  DOM.loginError.textContent = '';
  DOM.registerBtn.disabled = true;
  DOM.registerBtn.textContent = '生成中...';
  try {
    const res = await API.register();
    if (res.success) {
      DOM.newCode.style.display = 'block';
      DOM.newCodeDisplay.textContent = res.login_code;
      DOM.loginView.style.display = 'none';
      DOM.welcomeView.style.display = 'block';
    } else {
      DOM.loginError.textContent = res.message || '注册失败，请重试';
    }
  } catch (e) {
    DOM.loginError.textContent = '网络错误，请检查服务器';
  } finally {
    DOM.registerBtn.disabled = false;
    DOM.registerBtn.textContent = '🔮 领取登录代号';
  }
});

DOM.registerAgain.addEventListener('click', () => {
  DOM.loginView.style.display = 'block';
  DOM.welcomeView.style.display = 'none';
  DOM.newCode.style.display = 'none';
});

DOM.loginBtn.addEventListener('click', async () => {
  const code = DOM.loginCode.value.trim().toUpperCase();
  if (!code) {
    DOM.loginError.textContent = '请输入登录代号';
    return;
  }
  DOM.loginError.textContent = '';
  DOM.loginBtn.disabled = true;
  DOM.loginBtn.textContent = '登录中...';
  try {
    const res = await API.login(code);
    if (res.success) {
      STATE.user = res.user;
      sessionStorage.setItem('hk_exam_user', JSON.stringify(res.user));
      enterMain();
    } else {
      DOM.loginError.textContent = res.message || '登录失败';
    }
  } catch (e) {
    DOM.loginError.textContent = '网络错误，请检查服务器';
  } finally {
    DOM.loginBtn.disabled = false;
    DOM.loginBtn.textContent = '🔑 登录';
  }
});

// 回车登录
DOM.loginCode.addEventListener('keydown', e => {
  if (e.key === 'Enter') DOM.loginBtn.click();
});

// 自动登录
function tryAutoLogin() {
  const saved = sessionStorage.getItem('hk_exam_user');
  if (saved) {
    const user = JSON.parse(saved);
    STATE.user = user;
    enterMain();
    return true;
  }
  return false;
}

// ==================== 主界面 ====================

function enterMain() {
  DOM.headerCode.textContent = STATE.user.login_code;
  showPage('page-main');
  switchTab('exam');
  loadExamSelect();
}

DOM.btnLogout.addEventListener('click', () => {
  sessionStorage.removeItem('hk_exam_user');
  STATE.user = null;
  showPage('page-login');
  DOM.loginView.style.display = 'block';
  DOM.welcomeView.style.display = 'none';
  DOM.newCode.style.display = 'none';
  DOM.loginCode.value = '';
});

// ==================== Tab切换 ====================

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.page-content > .page').forEach(p => p.classList.remove('active'));

  if (tab === 'exam') {
    DOM.tabExam.classList.add('active');
    DOM.pageExam.classList.add('active');
  } else if (tab === 'wrong') {
    DOM.tabWrong.classList.add('active');
    DOM.pageWrong.classList.add('active');
    loadWrongList();
  } else if (tab === 'stats') {
    DOM.tabStats.classList.add('active');
    DOM.pageStats.classList.add('active');
    loadStats();
  }
}

DOM.tabExam.addEventListener('click', () => switchTab('exam'));
DOM.tabWrong.addEventListener('click', () => switchTab('wrong'));
DOM.tabStats.addEventListener('click', () => switchTab('stats'));

// ==================== 刷题 ====================

function loadExamSelect() {
  DOM.examSelect.style.display = 'flex';
  DOM.examArea.style.display = 'none';
  DOM.exam1Btn.classList.remove('selected');
  DOM.exam3Btn.classList.remove('selected');
  STATE.examType = null;
  STATE.questions = [];
  STATE.currentIndex = 0;
  STATE.reviewMode = false;
}

DOM.exam1Btn.addEventListener('click', () => startExam('1'));
DOM.exam3Btn.addEventListener('click', () => startExam('3'));

async function startExam(examType) {
  STATE.examType = examType;
  STATE.reviewMode = false;

  DOM.examSelect.style.display = 'none';
  DOM.examArea.style.display = 'block';

  DOM.examHeader.textContent = `考试 ${examType} — 题目加载中...`;

  try {
    const res = await API.getUnansweredQuestions(STATE.user.id, examType);
    if (res.success && res.questions.length > 0) {
      STATE.questions = res.questions;  // 不随机打乱，保持题目顺序
      DOM.examHeader.textContent = `考试 ${examType}`;
      showQuestion(0);  // 永远从第一道未答题开始
    } else {
      DOM.examArea.innerHTML = `<div class="card" style="text-align:center;padding:40px">
        <div style="font-size:48px;margin-bottom:12px">📭</div>
        <p>暂无题目</p>
        <p style="font-size:13px;color:#666688;margin-top:4px">请先导入题库</p>
        <button class="btn btn-sec" onclick="loadExamSelect()" style="margin-top:16px">返回</button>
      </div>`;
    }
  } catch (e) {
    DOM.examArea.innerHTML = `<div class="card" style="text-align:center;padding:40px">
      <p>❌ 加载失败：${e.message}</p>
      <button class="btn btn-sec" onclick="loadExamSelect()" style="margin-top:16px">返回</button>
    </div>`;
  }
}

function showQuestion(index) {
  if (!STATE.questions.length) return;
  const q = STATE.questions[index];
  STATE.currentIndex = index;
  STATE.selectedOption = null;
  STATE.answered = false;

  // 进度
  DOM.examProgress.textContent = `${index + 1} / ${STATE.questions.length}`;
  DOM.examCount.textContent = '';

  // 题目
  DOM.questionText.textContent = q.question_text;

  // 选项
  const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
  DOM.optionsContainer.innerHTML = '';
  q.options.forEach((opt, i) => {
    const div = document.createElement('div');
    div.className = 'option';
    div.innerHTML = `<span class="label">${labels[i]}</span>${opt}`;
    div.dataset.index = i;
    div.addEventListener('click', () => selectOption(i));
    DOM.optionsContainer.appendChild(div);
  });

  // 隐藏结果
  DOM.resultArea.style.display = 'none';
  DOM.explanationBox.classList.remove('show');
  DOM.btnPrev.style.display = index > 0 ? 'block' : 'none';
  DOM.btnNext.textContent = index < STATE.questions.length - 1 ? '下一题 →' : '完成 ✅';
  DOM.btnNext.disabled = true;

  // 查一下是否已经答过
  checkAnswered(q.id);
}

async function checkAnswered(questionId) {
  try {
    // 从已加载的错题中找，或者从进度查
    // 简单方案：查询单题记录
    const res = await API.getProgress(STATE.user.id, STATE.examType);
    if (res.success && res.answered > 0) {
      // 标记答题状态 - 通过本地查询
      // 实际上更好的方式是通过本地缓存
    }
  } catch (e) {}
}

function selectOption(index) {
  if (STATE.answered) return;
  STATE.selectedOption = index;

  document.querySelectorAll('.option').forEach(el => {
    el.classList.toggle('selected', parseInt(el.dataset.index) === index);
  });

  DOM.btnNext.disabled = false;
}

DOM.btnNext.addEventListener('click', async () => {
  if (STATE.selectedOption === null && !STATE.answered) return;

  const q = STATE.questions[STATE.currentIndex];

  if (!STATE.answered) {
    // 提交答案
    DOM.btnNext.disabled = true;
    DOM.btnNext.textContent = '提交中...';
    try {
      const res = await API.submitAnswer(STATE.user.id, q.id, STATE.selectedOption);
      if (res.success) {
        showAnswerResult(res, q, STATE.selectedOption);
        STATE.answered = true;
      }
    } catch (e) {
      alert('提交失败，请重试');
    } finally {
      DOM.btnNext.disabled = false;
    }
    return;
  }

  // 已经答过，去下一题
  if (STATE.currentIndex < STATE.questions.length - 1) {
    showQuestion(STATE.currentIndex + 1);
  } else {
    // 全部完成
    DOM.questionText.textContent = '🎉 全部刷完！';
    DOM.optionsContainer.innerHTML = '';
    DOM.resultArea.style.display = 'none';
    DOM.btnPrev.style.display = 'none';
    DOM.btnNext.style.display = 'none';
    DOM.examProgress.textContent = `${STATE.questions.length} / ${STATE.questions.length}`;
    DOM.examCount.innerHTML = `
      <div style="text-align:center;padding:20px">
        <p style="font-size:48px;margin-bottom:8px">🏆</p>
        <p style="color:#2d7d46;font-weight:700;margin-bottom:4px">恭喜完成本轮刷题</p>
        <button class="btn btn-pri" onclick="loadExamSelect()" style="margin-top:16px">换个科目刷</button>
        <button class="btn btn-sec" onclick="startExam('${STATE.examType}')" style="margin-top:8px">再来一轮</button>
      </div>
    `;
  }
});

function showAnswerResult(res, q, selectedIndex) {
  const labels = ['A', 'B', 'C', 'D', 'E', 'F'];

  // 显示正确/错误
  document.querySelectorAll('.option').forEach(el => {
    const idx = parseInt(el.dataset.index);
    el.classList.remove('selected', 'correct', 'wrong');
    if (idx === q.correct_index) el.classList.add('correct');
    if (idx === selectedIndex && !res.is_correct) el.classList.add('wrong');
    if (idx === selectedIndex && res.is_correct) el.classList.add('correct');
    el.style.cursor = 'default';
  });

  // 结果
  DOM.resultArea.style.display = 'block';
  DOM.resultBadge.className = `result-badge ${res.is_correct ? 'correct' : 'wrong'}`;
  DOM.resultBadge.textContent = res.is_correct ? '✅ 正确！' : `❌ 错误，正确答案是 ${labels[res.correct_index]}`;

  // 知识点讲解
  DOM.explanationBox.classList.add('show');
  DOM.kpText.textContent = `📖 ${res.knowledge_point}`;
  DOM.explanationText.textContent = res.explanation;

  // 改下一个按钮
  DOM.btnNext.textContent = STATE.currentIndex < STATE.questions.length - 1 ? '下一题 →' : '查看结果 ✅';
  DOM.btnNext.disabled = false;
}

DOM.btnPrev.addEventListener('click', () => {
  if (STATE.currentIndex > 0) {
    showQuestion(STATE.currentIndex - 1);
  }
});

// ==================== 错题复习 ====================

async function loadWrongList() {
  DOM.wrongList.style.display = 'block';
  DOM.wrongReview.style.display = 'none';

  try {
    const res = await API.getWrongQuestions(STATE.user.id);
    if (res.success && res.questions.length > 0) {
      STATE.wrongList = res.questions;
      STATE.reviewIndex = 0;
      STATE.reviewMode = false;

      let html = `<div style="margin-bottom:8px;font-size:13px;color:#8888aa">共 ${res.questions.length} 道错题</div>`;
      res.questions.forEach((q, i) => {
        const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
        html += `<div class="wrong-item" data-index="${i}">
          <div class="q-text">${q.question_text}</div>
          <div class="meta">
            <span class="tag" style="background:rgba(124,77,255,.1);color:#2d7d46">考试${q.exam_type}</span>
            <span class="tag" style="background:rgba(244,67,54,.1);color:#f44336">你选: ${labels[q.selected_index]}</span>
            <span class="tag" style="background:rgba(76,175,80,.1);color:#4caf50">正确: ${labels[q.correct_index]}</span>
          </div>
        </div>`;
      });
      DOM.wrongList.innerHTML = html;

      // 点击错题进入复习
      DOM.wrongList.querySelectorAll('.wrong-item').forEach(el => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.dataset.index);
          startWrongReview(idx);
        });
      });
    } else {
      DOM.wrongList.innerHTML = `<div class="card" style="text-align:center;padding:40px">
        <div style="font-size:48px;margin-bottom:8px">🎉</div>
        <p>暂无错题，继续保持！</p>
      </div>`;
      STATE.wrongList = [];
    }
  } catch (e) {
    DOM.wrongList.innerHTML = `<p style="color:#f44336">加载失败：${e.message}</p>`;
  }
}

function startWrongReview(index) {
  STATE.reviewIndex = index;
  STATE.reviewMode = true;

  DOM.wrongList.style.display = 'none';
  DOM.wrongReview.style.display = 'block';

  showWrongQuestion(index);
}

function showWrongQuestion(index) {
  const q = STATE.wrongList[index];
  if (!q) return;

  const labels = ['A', 'B', 'C', 'D', 'E', 'F'];

  DOM.wrongProgress.textContent = `${index + 1} / ${STATE.wrongList.length}`;
  DOM.wrongQText.textContent = q.question_text;

  let html = '';
  q.options.forEach((opt, i) => {
    let cls = 'option';
    if (i === q.correct_index) cls += ' correct';
    if (i === q.selected_index && i !== q.correct_index) cls += ' wrong';
    html += `<div class="${cls}" style="cursor:default;margin-bottom:6px">
      <span class="label">${labels[i]}</span>${opt}
    </div>`;
  });
  DOM.wrongOptions.innerHTML = html;

  DOM.wrongCorrect.textContent = `✅ 正确答案：${labels[q.correct_index]}`;
  DOM.wrongKp.textContent = `📖 ${q.knowledge_point}`;
  DOM.wrongExpText.textContent = q.explanation;

  DOM.wrongPrev.style.display = index > 0 ? 'block' : 'none';
  DOM.wrongNext.textContent = index < STATE.wrongList.length - 1 ? '下一题 →' : '完成复习 ✅';
  DOM.wrongBack.textContent = '← 返回错题列表';
}

DOM.wrongPrev.addEventListener('click', () => {
  if (STATE.reviewIndex > 0) showWrongQuestion(STATE.reviewIndex - 1);
});

DOM.wrongNext.addEventListener('click', () => {
  if (STATE.reviewIndex < STATE.wrongList.length - 1) {
    showWrongQuestion(STATE.reviewIndex + 1);
  } else {
    // 完成复习
    DOM.wrongReview.style.display = 'none';
    DOM.wrongList.style.display = 'block';
    showBottomBar('wrong-bottom-bar');
    loadWrongList();
  }
});

DOM.wrongBack.addEventListener('click', () => {
  DOM.wrongReview.style.display = 'none';
  DOM.wrongList.style.display = 'block';
  showBottomBar('wrong-bottom-bar');
});

// ==================== 统计 ====================

async function loadStats() {
  try {
    const [statsRes, wrongRes] = await Promise.all([
      API.getStats(STATE.user.id),
      API.getWrongStats(STATE.user.id)
    ]);

    let html = '';

    if (statsRes.success && statsRes.stats.length > 0) {
      statsRes.stats.forEach(s => {
        const accuracy = s.answered > 0 ? Math.round(s.correct / s.answered * 100) : 0;
        html += `<div class="card">
          <div class="card-title">📋 考试 ${s.exam_type}</div>
          <div class="dashboard-grid">
            <div class="dash-card"><div class="num" style="color:#2d7d46">${s.total_q}</div><div class="lbl">题目总数</div></div>
            <div class="dash-card"><div class="num" style="color:#3498db">${s.answered}</div><div class="lbl">已答题数</div></div>
            <div class="dash-card"><div class="num" style="color:#4caf50">${s.correct}</div><div class="lbl">答对</div></div>
            <div class="dash-card"><div class="num" style="color:#f44336">${s.wrong}</div><div class="lbl">答错</div></div>
          </div>
          <div class="stat-row"><span>正确率</span><strong>${accuracy}%</strong></div>
          <div class="progress-bar"><div class="fill" style="width:${accuracy}%"></div></div>
          <div class="stat-row"><span>进度</span><strong>${s.answered}/${s.total_q}</strong></div>
          <div class="progress-bar"><div class="fill" style="width:${s.total_q > 0 ? Math.round(s.answered/s.total_q*100) : 0}%"></div></div>
        </div>`;
      });
    } else {
      html += `<div class="card" style="text-align:center;padding:30px"><p>还没有刷题记录，开始刷题吧！</p></div>`;
    }

    // 错题分布
    if (wrongRes.success && wrongRes.by_exam.length > 0) {
      html += `<div class="card">
        <div class="card-title">📌 错题分布</div>`;
      wrongRes.by_exam.forEach(e => {
        html += `<div class="stat-row"><span>考试 ${e.exam_type}</span><strong style="color:#f44336">${e.count} 道错题</strong></div>`;
      });
      html += `</div>`;
    }

    // 重置按钮
    html += `<div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid #e8ecf1">
      <button id="btn-reset" class="btn btn-sec" style="width:auto;display:inline-block;padding:10px 24px;color:#e74c3c;border-color:#f5b7b1">🔄 重新开始</button>
      <p style="font-size:11px;color:#aab5c0;margin-top:6px">清空所有答题记录，从头来一遍</p>
    </div>`;

    DOM.statsContent.innerHTML = html;

    // 绑定重置事件
    document.getElementById('btn-reset')?.addEventListener('click', async () => {
      if (!confirm('确定要清空所有刷题记录吗？\n这个操作不可撤销。')) return;
      document.getElementById('btn-reset').disabled = true;
      document.getElementById('btn-reset').textContent = '处理中...';
      try {
        const res = await API.resetAnswers(STATE.user.id);
        if (res.success) {
          alert('✅ 已清空所有记录，重新开始吧！');
          loadStats();
        }
      } catch(e) {
        alert('操作失败');
      }
      document.getElementById('btn-reset').disabled = false;
      document.getElementById('btn-reset').textContent = '🔄 重新开始';
    });

  } catch (e) {
    DOM.statsContent.innerHTML = `<p style="color:#f44336">加载失败：${e.message}</p>`;
  }
}

// ==================== 底部栏管理 ====================

function showBottomBar(barId) {
  ['exam-bottom-bar', 'wrong-bottom-bar', 'exam-select-bar'].forEach(id => {
    document.getElementById(id).style.display = id === barId ? 'flex' : 'none';
  });
}

// 改写 startExam 显示底部刷题栏
const _origStartExam = startExam;
startExam = function(examType) {
  _origStartExam(examType);
  showBottomBar('exam-bottom-bar');
};

// 改写 switchTab 隐藏底部栏
const _origSwitchTab = switchTab;
switchTab = function(tab) {
  _origSwitchTab(tab);
  if (tab === 'exam') {
    if (STATE.examType) showBottomBar('exam-bottom-bar');
    else showBottomBar('exam-select-bar');
  } else if (tab === 'wrong') {
    showBottomBar('wrong-bottom-bar');
  } else {
    showBottomBar('exam-select-bar');
  }
};

// 切换科目
DOM.btnResetExam = document.getElementById('btn-reset-exam');
DOM.btnResetExam.addEventListener('click', () => {
  loadExamSelect();
  showBottomBar('exam-select-bar');
});

// 重写 loadExamSelect 以显示选择栏
const _origLoadExamSelect = loadExamSelect;
loadExamSelect = function() {
  _origLoadExamSelect();
  showBottomBar('exam-select-bar');
};

// ==================== 启动 ====================

// 前后端同源，直接用相对路径
API.base = '/api';

// 检查自动登录
if (!tryAutoLogin()) {
  showPage('page-login');
}
