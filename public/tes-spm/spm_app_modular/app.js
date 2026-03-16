const CONFIG = {
  totalQuestions: 60,
  durationSeconds: 30 * 60,
  optionCount: 8,
  imageDir: '/tes-spm/webp/',
  imageExt: '.webp',
  storageKey: 'spm_answers_v2',
  metaKey: 'spm_meta_v2',
  answerClickLayout: {
    startX: 0.07,
    startY: 0.59,
    cellWidth: 0.19,
    cellHeight: 0.11,
    gapX: 0.028,
    gapY: 0.046,
    columns: 4,
  },
};

const ANSWER_KEY = {
  A1: 4, A2: 5, A3: 1, A4: 2, A5: 6, A6: 3, A7: 6, A8: 2, A9: 1, A10: 3, A11: 4, A12: 5,
  B1: 2, B2: 6, B3: 1, B4: 2, B5: 1, B6: 3, B7: 5, B8: 6, B9: 4, B10: 3, B11: 4, B12: 5,
  C1: 8, C2: 2, C3: 3, C4: 8, C5: 7, C6: 4, C7: 5, C8: 1, C9: 7, C10: 6, C11: 1, C12: 2,
  D1: 3, D2: 4, D3: 3, D4: 7, D5: 8, D6: 6, D7: 5, D8: 4, D9: 1, D10: 2, D11: 5, D12: 6,
  E1: 7, E2: 6, E3: 8, E4: 2, E5: 1, E6: 5, E7: 1, E8: 6, E9: 3, E10: 2, E11: 4, E12: 5,
};

const IQ_CONVERSION_TABLE = {
  2: 62, 3: 62, 4: 65, 5: 66, 6: 66, 7: 66, 8: 69, 9: 70, 10: 72,
  11: 73, 12: 74, 13: 74, 14: 74, 15: 74, 16: 74, 17: 76, 18: 76,
  19: 77, 20: 77, 21: 78, 22: 79, 23: 80, 24: 81, 25: 82, 26: 84,
  27: 85, 28: 87, 29: 88, 30: 89, 31: 90, 32: 92, 33: 93, 34: 94,
  35: 96, 36: 97, 37: 98, 38: 99, 39: 100, 40: 101, 41: 102, 42: 104,
  43: 105, 44: 107, 45: 108, 46: 110, 47: 113, 48: 115, 49: 117,
  50: 120, 51: 122, 52: 124, 53: 125, 54: 126, 55: 129, 56: 130,
  57: 134, 58: 134, 59: 138, 60: 138,
};

const params = new URLSearchParams(window.location.search);
const packageContext = {
  token: params.get('package_token'),
  packageId: params.get('package_id'),
  itemId: params.get('item_id'),
  returnUrl: params.get('return_url'),
};
const isPackageMode = Boolean(packageContext.itemId && packageContext.packageId);
const supabaseConfig = window.TEST_PACKAGE_SUPABASE_CONFIG;
const supabaseLib = window.supabase;
const supabaseClient = supabaseConfig?.url && supabaseConfig?.publishableKey && supabaseLib?.createClient
  ? supabaseLib.createClient(supabaseConfig.url, supabaseConfig.publishableKey)
  : null;
const storageKeys = {
  answers: isPackageMode ? `${CONFIG.storageKey}_${packageContext.itemId}` : CONFIG.storageKey,
  meta: isPackageMode ? `${CONFIG.metaKey}_${packageContext.itemId}` : CONFIG.metaKey,
};

const el = (id) => document.getElementById(id);

const state = {
  index: 0,
  answers: loadAnswers(),
  startedAt: loadMeta().startedAt || null,
  timerSeconds: (() => {
    const meta = loadMeta();
    return Number.isFinite(meta.remainingSeconds) ? Math.max(0, Number(meta.remainingSeconds)) : CONFIG.durationSeconds;
  })(),
  timerId: null,
  hasSubmitted: false,
  currentImageObjectUrl: null,
  view: 'intro',
  practiceIndex: 0,
  practiceCompleted: false,
  practiceSelected: null,
  practiceAnswerSubmitted: false,
};

const questionIds = buildQuestionIds(CONFIG.totalQuestions);
const questions = questionIds.map((id) => ({ id, img: `${CONFIG.imageDir}${id}${CONFIG.imageExt}` }));
const PRACTICE_ITEMS = [
  {
    id: 'A1',
    img: `${CONFIG.imageDir}A1${CONFIG.imageExt}`,
    correct: 4,
    explanation: 'Perhatikan bahwa pola garis di area kosong harus mengikuti susunan garis horizontal dan vertikal di sekitarnya.',
  },
  {
    id: 'A2',
    img: `${CONFIG.imageDir}A2${CONFIG.imageExt}`,
    correct: 5,
    explanation: 'Cari hubungan bentuk dan arah pola di seluruh bidang, lalu pilih bagian yang paling konsisten untuk melengkapi area kosong.',
  },
];

const ui = {
  statusPillLabel: el('statusPillLabel'),
  qImg: el('qImg'),
  qTitle: el('qTitle'),
  qIndexLabel: el('qIndexLabel'),
  qTotalLabel: el('qTotalLabel'),
  selectedLabel: el('selectedLabel'),
  answeredCount: el('answeredCount'),
  answeredCount2: el('answeredCount2'),
  totalCount: el('totalCount'),
  timeRemaining: el('timeRemaining'),
  remainingCount: el('remainingCount'),
  barFill: el('barFill'),
  choices: el('choices'),
  numsGrid: el('numsGrid'),
  resultBox: el('resultBox'),
  btnPrev: el('btnPrev'),
  btnNext: el('btnNext'),
  btnClear: el('btnClear'),
  btnFinish: el('btnFinish'),
  btnCopy: el('btnCopy'),
  btnReset: el('btnReset'),
  btnFinishMain: el('btnFinishMain'),
  btnResetMain: el('btnResetMain'),
  submitMeta: el('submitMeta'),
  submitState: el('submitState'),
  modal: el('modal'),
  btnZoom: el('btnZoom'),
  btnCloseModal: el('btnCloseModal'),
  modalImg: el('modalImg'),
  modalTitle: el('modalTitle'),
  introView: el('introView'),
  simulationView: el('simulationView'),
  readyView: el('readyView'),
  runningView: el('runningView'),
  completedView: el('completedView'),
  completedMessage: el('completedMessage'),
  btnShowExample: el('btnShowExample'),
  btnStartPractice: el('btnStartPractice'),
  practiceIndexLabel: el('practiceIndexLabel'),
  practiceTotalLabel: el('practiceTotalLabel'),
  practiceTitle: el('practiceTitle'),
  practiceImg: el('practiceImg'),
  practiceChoices: el('practiceChoices'),
  practiceFeedback: el('practiceFeedback'),
  btnPracticeNext: el('btnPracticeNext'),
  btnRepeatPractice: el('btnRepeatPractice'),
  btnStartMainTest: el('btnStartMainTest'),
};

init();

function init() {
  if (ui.qTotalLabel) ui.qTotalLabel.textContent = String(questions.length);
  if (ui.totalCount) ui.totalCount.textContent = String(questions.length);

  if (isPackageMode) {
    document.title = 'Tes Penalaran Pola';
    const titleNode = document.querySelector('.title');
    const subNode = document.querySelector('.sub');
    if (titleNode) titleNode.textContent = 'Tes Penalaran Pola';
    if (subNode) {
      subNode.innerHTML = 'Jawab seluruh soal sampai selesai dalam waktu 30 menit.<br />Gunakan tombol angka <b>1-8</b> di bawah soal untuk memilih jawaban. Jika waktu habis, jawaban akan dikirim otomatis.';
    }
    if (ui.submitMeta) {
      ui.submitMeta.textContent = 'Jawaban akan dikirim ke tim rekrutmen secara internal saat Anda submit atau saat waktu habis.';
    }
  }

  if (ui.practiceTotalLabel) ui.practiceTotalLabel.textContent = String(PRACTICE_ITEMS.length);
  renderNums();
  renderQuestion();
  updateProgress();
  updateTimerDisplay();
  void guardPackageAccess();
  wireEvents();
  hydrateInitialView();
}

function hydrateInitialView() {
  const meta = loadMeta();
  const hasProgress = Object.keys(state.answers).length > 0 || (Number.isFinite(meta.remainingSeconds) && Number(meta.remainingSeconds) < CONFIG.durationSeconds);
  const onboardingCompleted = Boolean(meta.onboardingCompleted);

  if (state.hasSubmitted) {
    setView('completed');
    return;
  }

  if (onboardingCompleted || hasProgress) {
    startMainTestSession({ resume: true });
    return;
  }

  setView('intro');
}

function setView(nextView) {
  state.view = nextView;
  ui.introView?.classList.toggle('hidden', nextView !== 'intro');
  ui.simulationView?.classList.toggle('hidden', nextView !== 'simulation');
  ui.readyView?.classList.toggle('hidden', nextView !== 'ready');
  ui.runningView?.classList.toggle('hidden', nextView !== 'running');
  ui.completedView?.classList.toggle('hidden', nextView !== 'completed');

  if (ui.statusPillLabel) {
    ui.statusPillLabel.textContent = nextView === 'running' ? 'Sisa waktu:' : 'Durasi tes:';
  }

  if (nextView !== 'running' && ui.timeRemaining) {
    ui.timeRemaining.textContent = '30:00';
  }
}

function updateMeta(partial) {
  const current = loadMeta();
  localStorage.setItem(storageKeys.meta, JSON.stringify({ ...current, ...partial }));
}

function startMainTestSession({ resume = false } = {}) {
  if (!resume) {
    state.startedAt = new Date().toISOString();
    state.timerSeconds = CONFIG.durationSeconds;
    state.answers = {};
    state.index = 0;
    state.hasSubmitted = false;
    clearSavedState();
    updateMeta({
      startedAt: state.startedAt,
      remainingSeconds: state.timerSeconds,
      onboardingCompleted: true,
    });
  } else if (!state.startedAt) {
    state.startedAt = new Date().toISOString();
    updateMeta({ startedAt: state.startedAt, onboardingCompleted: true });
  }

  renderQuestion();
  updateProgress();
  updateTimerDisplay();
  setView('running');
  startTimer();
}

function buildQuestionIds(total) {
  if (total <= 12) {
    return Array.from({ length: total }, (_, i) => `A${i + 1}`);
  }

  const sets = ['A', 'B', 'C', 'D', 'E'];
  const ids = [];
  for (const set of sets) {
    for (let n = 1; n <= 12; n += 1) {
      ids.push(`${set}${n}`);
    }
  }
  return ids.slice(0, total);
}

function loadAnswers() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.answers) || '{}');
  } catch {
    return {};
  }
}

function loadMeta() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.meta) || '{}');
  } catch {
    return {};
  }
}

function saveState() {
  localStorage.setItem(storageKeys.answers, JSON.stringify(state.answers));
  updateMeta({ startedAt: state.startedAt, remainingSeconds: state.timerSeconds, onboardingCompleted: true });
}

function clearSavedState() {
  localStorage.removeItem(storageKeys.answers);
  localStorage.removeItem(storageKeys.meta);
}

function updateTimerDisplay() {
  if (!ui.timeRemaining) return;
  const minutes = Math.floor(state.timerSeconds / 60);
  const seconds = state.timerSeconds % 60;
  ui.timeRemaining.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function startTimer() {
  if (state.timerId || state.hasSubmitted) return;
  state.timerId = window.setInterval(() => {
    if (state.timerSeconds <= 0) {
      window.clearInterval(state.timerId);
      state.timerId = null;
      void handleFinish(true);
      return;
    }

    state.timerSeconds -= 1;
    saveState();
    updateTimerDisplay();

    if (state.timerSeconds <= 0) {
      window.clearInterval(state.timerId);
      state.timerId = null;
      void handleFinish(true);
    }
  }, 1000);
}

async function guardPackageAccess() {
  if (!supabaseClient || !isPackageMode) return;

  try {
    const { data, error } = await supabaseClient
      .from('candidate_test_package_items')
      .select('status')
      .eq('id', Number(packageContext.itemId))
      .single();

    if (error) throw error;

    if (['completed', 'incomplete', 'expired'].includes(data?.status)) {
      lockCompletedAttempt(data.status);
    }
  } catch (error) {
    console.error('Gagal memeriksa status item paket SPM:', error);
  }
}

function lockCompletedAttempt(status) {
  state.hasSubmitted = true;
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }

  const titleNode = document.querySelector('.title');
  const subNode = document.querySelector('.sub');
  if (titleNode) titleNode.textContent = 'Tes sudah ditutup';
  if (subNode) {
    subNode.innerHTML = status === 'completed'
      ? 'Tes penalaran pola ini sudah selesai dikerjakan dan tidak dapat dibuka kembali.'
      : 'Tes penalaran pola ini sudah ditutup dan tidak dapat dikerjakan kembali.';
  }

  if (ui.btnFinishMain) ui.btnFinishMain.disabled = true;
  if (ui.btnResetMain) ui.btnResetMain.disabled = true;
  if (ui.btnClear) ui.btnClear.disabled = true;
  if (ui.btnPrev) ui.btnPrev.disabled = true;
  if (ui.btnNext) ui.btnNext.disabled = true;
  if (ui.btnZoom) ui.btnZoom.disabled = true;
  if (ui.choices) {
    ui.choices.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  }

  setSubmitState(
    status === 'completed'
      ? 'Tes ini sudah selesai dan terkunci. Anda tidak dapat masuk ke tes yang sama lagi.'
      : 'Tes ini sudah ditutup dan tidak dapat dikerjakan kembali.',
    'warn'
  );
  setView('completed');
  if (ui.completedMessage) {
    ui.completedMessage.textContent = status === 'completed'
      ? 'Tes penalaran pola ini sudah selesai dikerjakan dan tidak dapat dibuka kembali.'
      : 'Tes penalaran pola ini sudah ditutup dan tidak dapat dikerjakan kembali.';
  }
}

function renderNums() {
  ui.numsGrid.innerHTML = '';
  questions.forEach((q, i) => {
    const node = document.createElement('div');
    node.className = 'num';
    node.textContent = String(i + 1);
    node.onclick = () => {
      state.index = i;
      renderQuestion();
    };
    ui.numsGrid.appendChild(node);
  });
}

function renderChoices(selected) {
  ui.choices.innerHTML = '';
  for (let i = 1; i <= CONFIG.optionCount; i += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `choiceBtn${Number(selected) === i ? ' selected' : ''}`;
    btn.textContent = String(i);
    btn.onclick = () => selectAnswer(i);
    ui.choices.appendChild(btn);
  }
}

function getAnswerRegions() {
  const layout = CONFIG.answerClickLayout;
  return Array.from({ length: CONFIG.optionCount }, (_, index) => {
    const col = index % layout.columns;
    const row = Math.floor(index / layout.columns);

    return {
      value: index + 1,
      left: layout.startX + (col * (layout.cellWidth + layout.gapX)),
      top: layout.startY + (row * (layout.cellHeight + layout.gapY)),
      width: layout.cellWidth,
      height: layout.cellHeight,
    };
  });
}

function getImageAnswerFromEvent(event, image) {
  const rect = image.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;

  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;

  for (const region of getAnswerRegions()) {
    const insideX = x >= region.left && x <= region.left + region.width;
    const insideY = y >= region.top && y <= region.top + region.height;
    if (insideX && insideY) return region.value;
  }

  return null;
}

function updateImageCursor(event) {
  const value = getImageAnswerFromEvent(event, ui.qImg);
  ui.qImg.style.cursor = value ? 'pointer' : 'default';
}

function renderQuestion() {
  const q = questions[state.index];
  ui.qTitle.textContent = q.id;
  ui.qIndexLabel.textContent = String(state.index + 1);

  ui.qImg.removeAttribute('src');
  ui.qImg.alt = `Memuat gambar soal ${q.id}...`;
  void loadQuestionImage(q);

  const selected = state.answers[q.id] ?? null;
  ui.selectedLabel.textContent = selected ? String(selected) : '-';

  renderChoices(selected);
  syncNums();
  ui.btnPrev.disabled = state.index === 0;
  ui.btnNext.disabled = state.index === questions.length - 1;
}

async function loadQuestionImage(question) {
  if (state.currentImageObjectUrl) {
    URL.revokeObjectURL(state.currentImageObjectUrl);
    state.currentImageObjectUrl = null;
  }

  try {
    const response = await fetch(question.img, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    state.currentImageObjectUrl = objectUrl;
    ui.qImg.src = objectUrl;
    ui.qImg.alt = `Gambar soal ${question.id}`;
  } catch (error) {
    console.error(`Gagal memuat gambar soal ${question.id}:`, error);
    ui.qImg.removeAttribute('src');
    ui.qImg.alt = `Gambar tidak ditemukan: ${question.img}`;
  }
}

async function loadPracticeImage(practiceItem) {
  if (!ui.practiceImg) return;

  ui.practiceImg.removeAttribute('src');
  ui.practiceImg.alt = `Memuat simulasi ${practiceItem.id}...`;

  try {
    const response = await fetch(practiceItem.img, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    ui.practiceImg.src = objectUrl;
    ui.practiceImg.alt = `Contoh soal ${practiceItem.id}`;
  } catch (error) {
    console.error(`Gagal memuat gambar simulasi ${practiceItem.id}:`, error);
    ui.practiceImg.removeAttribute('src');
    ui.practiceImg.alt = `Gambar simulasi tidak ditemukan: ${practiceItem.img}`;
  }
}

function renderPractice() {
  const item = PRACTICE_ITEMS[state.practiceIndex];
  if (!item || !ui.practiceChoices) return;

  state.practiceSelected = null;
  state.practiceAnswerSubmitted = false;
  ui.practiceIndexLabel.textContent = String(state.practiceIndex + 1);
  ui.practiceTitle.textContent = item.id;
  ui.btnPracticeNext.disabled = true;
  ui.btnPracticeNext.textContent = state.practiceIndex === PRACTICE_ITEMS.length - 1 ? 'Selesai simulasi' : 'Lanjut';
  ui.practiceFeedback.style.display = 'none';
  ui.practiceFeedback.textContent = '';
  ui.practiceFeedback.className = 'submitState';
  void loadPracticeImage(item);

  ui.practiceChoices.innerHTML = '';
  for (let i = 1; i <= CONFIG.optionCount; i += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choiceBtn';
    button.textContent = String(i);
    button.onclick = () => submitPracticeAnswer(i);
    ui.practiceChoices.appendChild(button);
  }
}

function submitPracticeAnswer(value) {
  if (state.practiceAnswerSubmitted) return;

  const item = PRACTICE_ITEMS[state.practiceIndex];
  state.practiceSelected = value;
  state.practiceAnswerSubmitted = true;

  ui.practiceChoices.querySelectorAll('button').forEach((button, index) => {
    const option = index + 1;
    button.disabled = true;
    button.classList.toggle('selected', option === value);
  });

  const isCorrect = value === item.correct;
  ui.practiceFeedback.style.display = 'block';
  ui.practiceFeedback.className = `submitState ${isCorrect ? 'ok' : 'warn'}`;
  ui.practiceFeedback.textContent = isCorrect
    ? 'Jawaban benar. Anda sudah memahami cara memilih pola yang sesuai.'
    : `Perhatikan bahwa pola pada area kosong harus mengikuti susunan garis di sekitarnya. Jawaban yang tepat untuk contoh ini adalah ${item.correct}. ${item.explanation}`;
  ui.btnPracticeNext.disabled = false;
}

function goToNextPractice() {
  if (!state.practiceAnswerSubmitted) return;

  if (state.practiceIndex >= PRACTICE_ITEMS.length - 1) {
    state.practiceCompleted = true;
    setView('ready');
    return;
  }

  state.practiceIndex += 1;
  renderPractice();
}

function syncNums() {
  [...ui.numsGrid.children].forEach((node, i) => {
    const q = questions[i];
    node.classList.toggle('active', i === state.index);
    node.classList.toggle('done', !!state.answers[q.id]);
  });
}

function updateProgress() {
  const answered = Object.keys(state.answers).length;
  if (ui.answeredCount) ui.answeredCount.textContent = String(answered);
  if (ui.answeredCount2) ui.answeredCount2.textContent = String(answered);
  if (ui.remainingCount) ui.remainingCount.textContent = String(questions.length - answered);
  if (ui.barFill) ui.barFill.style.width = `${Math.round((answered / questions.length) * 100)}%`;
  syncNums();
}

function selectAnswer(value) {
  const q = questions[state.index];
  state.answers[q.id] = value;

  if (state.index < questions.length - 1) {
    state.index += 1;
  }

  saveState();
  renderQuestion();
  updateProgress();
}

function clearAnswer() {
  const q = questions[state.index];
  delete state.answers[q.id];
  saveState();
  renderQuestion();
  updateProgress();
}

function buildScore() {
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  const details = questions.map((q) => {
    const user = state.answers[q.id] ?? null;
    const key = ANSWER_KEY[q.id] ?? null;
    const isCorrect = user !== null && key !== null && Number(user) === Number(key);

    if (user === null) unanswered += 1;
    else if (isCorrect) correct += 1;
    else wrong += 1;

    return { id: q.id, user, key, isCorrect };
  });

  return { total: questions.length, correct, wrong, unanswered, details };
}

function convertRawScoreToIq(rawScore) {
  const n = Number(rawScore);
  if (!Number.isFinite(n)) return null;

  const clamped = Math.max(2, Math.min(60, Math.round(n)));
  return IQ_CONVERSION_TABLE[clamped] ?? null;
}

function classifyIq(iqScore) {
  if (iqScore === null) return null;

  if (iqScore >= 140) return 'Genius';
  if (iqScore >= 130) return 'Very Superior';
  if (iqScore >= 120) return 'Superior';
  if (iqScore >= 110) return 'High Average';
  if (iqScore >= 90) return 'Average';
  if (iqScore >= 80) return 'Low Average';
  if (iqScore >= 70) return 'Borderline Defective';
  return 'Mentally Defective';
}

function buildPayload() {
  const score = buildScore();
  const iqScore = convertRawScoreToIq(score.correct);

  return {
    test: 'SPM',
    total_questions: score.total,
    started_at: state.startedAt,
    ended_at: new Date().toISOString(),
    score: {
      correct: score.correct,
      wrong: score.wrong,
      unanswered: score.unanswered,
      total: score.total,
      percent: Math.round((score.correct / score.total) * 100),
    },
    iq_result: {
      raw_score: score.correct,
      iq: iqScore,
      classification: classifyIq(iqScore),
    },
    answers: score.details,
  };
}

function setSubmitState(message, tone = '') {
  if (!ui.submitState) return;

  if (!message) {
    ui.submitState.style.display = 'none';
    ui.submitState.textContent = '';
    ui.submitState.className = 'submitState';
    return;
  }

  ui.submitState.style.display = 'block';
  ui.submitState.textContent = message;
  ui.submitState.className = `submitState${tone ? ` ${tone}` : ''}`;
}

async function syncPackageStatus(packageId) {
  if (!supabaseClient || !packageId) return;

  const numericPackageId = Number(packageId);
  const { data: items, error } = await supabaseClient
    .from('candidate_test_package_items')
    .select('status')
    .eq('package_id', numericPackageId);

  if (error) throw error;

  const statuses = (items || []).map((item) => item.status);
  const payload = {};

  if (statuses.length && statuses.every((status) => status === 'completed')) {
    payload.status = 'completed';
    payload.completed_at = new Date().toISOString();
  } else if (statuses.some((status) => status === 'completed' || status === 'in_progress')) {
    payload.status = 'in_progress';
  } else {
    payload.status = 'opened';
  }

  const { error: updateError } = await supabaseClient
    .from('candidate_test_packages')
    .update(payload)
    .eq('id', numericPackageId);

  if (updateError) throw updateError;
}

async function saveResultToPackage(payload) {
  if (!supabaseClient || !isPackageMode) return false;

  const now = new Date().toISOString();
  const correct = payload.score?.correct ?? 0;
  const total = payload.score?.total ?? questions.length;
  const iqScore = payload.iq_result?.iq ?? null;
  const classification = payload.iq_result?.classification || 'Belum terklasifikasi';
  const summary = `Benar ${correct}/${total} soal. Estimasi IQ ${iqScore ?? '-'} dengan klasifikasi ${classification}.`;

  const { error } = await supabaseClient
    .from('candidate_test_package_items')
    .update({
      status: 'completed',
      started_at: payload.started_at,
      completed_at: now,
      score_numeric: iqScore,
      score_label: iqScore ? `IQ ${iqScore} / ${classification}` : classification,
      summary,
      result_json: {
        saved_at: now,
        score: payload.score,
        iq_result: payload.iq_result,
        total_questions: payload.total_questions,
        started_at: payload.started_at,
        ended_at: payload.ended_at,
      },
    })
    .eq('id', Number(packageContext.itemId));

  if (error) throw error;

  await syncPackageStatus(packageContext.packageId);
  return true;
}

function resetAssessment() {
  if (!confirm('Reset semua jawaban?')) return;
  clearSavedState();
  location.reload();
}

async function handleFinish(isAutoSubmit = false) {
  if (state.hasSubmitted) return;
  state.hasSubmitted = true;
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }

  const payload = buildPayload();

  if (!isPackageMode) {
    ui.resultBox.value = JSON.stringify(payload, null, 2);
    if (ui.completedMessage) {
      ui.completedMessage.textContent = 'Tes sudah selesai. Hasil akan direview secara internal oleh tim rekrutmen.';
    }
    setView('completed');
    return;
  }

  ui.btnFinishMain.disabled = true;
  ui.btnFinish.disabled = true;
  setSubmitState(
    isAutoSubmit
      ? 'Waktu habis. Jawaban sedang dikirim otomatis ke paket tes kandidat...'
      : 'Menyimpan hasil tes penalaran ke paket tes kandidat...',
    ''
  );

  try {
    await saveResultToPackage(payload);
    clearSavedState();
    setSubmitState(
      isAutoSubmit
        ? 'Waktu habis dan jawaban tes penalaran sudah diterima. Anda akan kembali ke halaman paket tes.'
        : 'Jawaban tes penalaran sudah diterima. Anda akan kembali ke halaman paket tes.',
      'ok'
    );

    window.setTimeout(() => {
      if (packageContext.returnUrl) {
        window.location.href = packageContext.returnUrl;
      } else {
        if (ui.completedMessage) {
          ui.completedMessage.textContent = 'Tes penalaran pola sudah selesai. Hasil akan direview secara internal oleh tim rekrutmen.';
        }
        setView('completed');
      }
    }, 1200);
  } catch (error) {
    console.error('Gagal menyimpan hasil SPM ke paket tes:', error);
    setSubmitState('Jawaban belum berhasil disimpan ke paket tes. Coba ulangi atau hubungi recruiter.', 'warn');
    state.hasSubmitted = false;
    ui.btnFinishMain.disabled = false;
    ui.btnFinish.disabled = false;
    startTimer();
  }
}

function wireEvents() {
  if (ui.btnShowExample) {
    ui.btnShowExample.onclick = () => {
      state.practiceIndex = 0;
      setView('simulation');
      renderPractice();
    };
  }

  if (ui.btnStartPractice) {
    ui.btnStartPractice.onclick = () => {
      state.practiceIndex = 0;
      setView('simulation');
      renderPractice();
    };
  }

  if (ui.btnPracticeNext) {
    ui.btnPracticeNext.onclick = () => {
      goToNextPractice();
    };
  }

  if (ui.btnRepeatPractice) {
    ui.btnRepeatPractice.onclick = () => {
      state.practiceIndex = 0;
      setView('simulation');
      renderPractice();
    };
  }

  if (ui.btnStartMainTest) {
    ui.btnStartMainTest.onclick = () => {
      startMainTestSession();
    };
  }

  ui.btnPrev.onclick = () => {
    if (state.index > 0) {
      state.index -= 1;
      renderQuestion();
    }
  };

  ui.btnNext.onclick = () => {
    if (state.index < questions.length - 1) {
      state.index += 1;
      renderQuestion();
    }
  };

  ui.btnClear.onclick = clearAnswer;

  ui.btnFinish.onclick = () => {
    void handleFinish();
  };
  ui.btnFinishMain.onclick = () => {
    void handleFinish();
  };

  ui.btnCopy.onclick = async () => {
    const text = ui.resultBox.value || JSON.stringify(buildPayload(), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      ui.btnCopy.textContent = 'Copied OK';
      setTimeout(() => {
        ui.btnCopy.textContent = 'Copy JSON';
      }, 900);
    } catch {
      alert('Gagal copy. Blok teks lalu Ctrl+C.');
    }
  };

  ui.btnReset.onclick = resetAssessment;
  ui.btnResetMain.onclick = resetAssessment;

  ui.btnZoom.onclick = () => {
    const q = questions[state.index];
    ui.modalTitle.textContent = `Zoom ${q.id}`;
    ui.modalImg.src = q.img;
    ui.modal.classList.add('show');
  };

  ui.btnCloseModal.onclick = () => ui.modal.classList.remove('show');
  ui.modal.onclick = (event) => {
    if (event.target === ui.modal) {
      ui.modal.classList.remove('show');
    }
  };

  ui.qImg.onclick = null;
  ui.qImg.onmousemove = null;
  ui.qImg.onmouseleave = null;
  ui.qImg.style.cursor = 'default';

  window.addEventListener('keydown', (event) => {
    if (state.view !== 'running') return;
    if (event.key === 'ArrowLeft') ui.btnPrev.click();
    if (event.key === 'ArrowRight') ui.btnNext.click();
    if (event.key === 'Escape') ui.modal.classList.remove('show');

    if (/^\d$/.test(event.key)) {
      const n = Number(event.key);
      if (n >= 1 && n <= CONFIG.optionCount) selectAnswer(n);
    }
  });
}
