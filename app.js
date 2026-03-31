// ====== PERSISTENCE (localStorage with fallback) ======
const STORAGE_KEY = 'kidQuizData';

const storage = (() => {
  try { const s = window['local' + 'Storage']; const k = '__test__'; s.setItem(k, '1'); s.removeItem(k); return s; }
  catch(e) { const m = {}; return { getItem: k => m[k] ?? null, setItem: (k,v) => { m[k] = v; }, removeItem: k => { delete m[k]; } }; }
})();

function loadData() {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      // Migrate older data missing new fields
      if (!d.moneyQuizzes) d.moneyQuizzes = 0;
      if (!d.gradeBadges) d.gradeBadges = [];
      if (!d.gradeQuizzes) d.gradeQuizzes = {};
      if (!d.gradePerfects) d.gradePerfects = {};
      return d;
    }
  } catch(e) {}
  return {
    totalQuizzes: 0,
    totalCorrect: 0,
    totalTickets: 0,
    perfectQuizzes: 0,
    mathQuizzes: 0,
    readingQuizzes: 0,
    moneyQuizzes: 0,
    streakDays: 0,
    lastPlayDate: null,
    badges: [],
    // Per-grade tracking: { "math_prek": 3, "reading_kinder": 1, ... }
    gradeQuizzes: {},
    gradePerfects: {},
    gradeBadges: [],
  };
}

function saveData() {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(persist));
  } catch(e) {}
}

let persist = loadData();

// ====== BADGE DEFINITIONS ======
// Overall badges
const BADGE_DEFS = [
  { id: 'first_quiz',    emoji: '🌟', name: 'First Quiz',       desc: 'Complete your first quiz',           check: d => d.totalQuizzes >= 1 },
  { id: 'five_quizzes',  emoji: '🔥', name: 'On Fire',          desc: 'Complete 5 quizzes',                 check: d => d.totalQuizzes >= 5 },
  { id: 'ten_quizzes',   emoji: '🏆', name: 'Quiz Champion',    desc: 'Complete 10 quizzes',                check: d => d.totalQuizzes >= 10 },
  { id: 'perfect',       emoji: '💯', name: 'Perfect Score',    desc: 'Get 100% on a quiz',                 check: d => d.perfectQuizzes >= 1 },
  { id: 'five_perfect',  emoji: '👑', name: 'Perfection',       desc: 'Get 5 perfect scores',               check: d => d.perfectQuizzes >= 5 },
  { id: 'math_fan',      emoji: '🧮', name: 'Math Fan',         desc: 'Complete 3 math quizzes',            check: d => d.mathQuizzes >= 3 },
  { id: 'bookworm',      emoji: '📚', name: 'Bookworm',         desc: 'Complete 3 reading quizzes',         check: d => d.readingQuizzes >= 3 },
  { id: 'money_smart',   emoji: '💰', name: 'Money Smart',      desc: 'Complete 3 money quizzes',           check: d => d.moneyQuizzes >= 3 },
  { id: 'streak_3',      emoji: '⚡', name: '3-Day Streak',     desc: 'Play 3 days in a row',               check: d => d.streakDays >= 3 },
  { id: 'streak_7',      emoji: '🌈', name: 'Week Warrior',     desc: 'Play 7 days in a row',               check: d => d.streakDays >= 7 },
  { id: 'ticket_master', emoji: '🎫', name: 'Ticket Master',    desc: 'Earn 50 tickets total',              check: d => d.totalTickets >= 50 },
  { id: 'hundred_right', emoji: '🧠', name: 'Big Brain',        desc: 'Get 100 correct answers',            check: d => d.totalCorrect >= 100 },
  { id: 'all_modes',     emoji: '🌍', name: 'Well Rounded',     desc: 'Complete math, reading, and money',  check: d => d.mathQuizzes >= 1 && d.readingQuizzes >= 1 && d.moneyQuizzes >= 1 },
];

// Per-grade badge templates
const GRADE_LEVELS = ['prek', 'kinder', 'first', 'second'];
const GRADE_NAMES = { prek: 'Pre-K', kinder: 'Kindergarten', first: '1st Grade', second: '2nd Grade' };
const GRADE_EMOJIS = { prek: '🌱', kinder: '🌻', first: '🌳', second: '🏔️' };
const MODE_NAMES = { math: 'Math', reading: 'Reading', money: 'Money' };
const MODE_EMOJIS = { math: '🧮', reading: '📖', money: '💵' };

// Generate per-grade badges dynamically
const GRADE_BADGE_DEFS = [];
['math', 'reading', 'money'].forEach(mode => {
  GRADE_LEVELS.forEach(grade => {
    const key = `${mode}_${grade}`;
    const gName = GRADE_NAMES[grade];
    const mName = MODE_NAMES[mode];
    // 3 quizzes at this grade+mode
    GRADE_BADGE_DEFS.push({
      id: `${key}_3`,
      emoji: MODE_EMOJIS[mode],
      name: `${mName} ${gName}`,
      desc: `Complete 3 ${mName.toLowerCase()} quizzes at ${gName}`,
      check: d => (d.gradeQuizzes[key] || 0) >= 3,
    });
    // Perfect at this grade+mode
    GRADE_BADGE_DEFS.push({
      id: `${key}_perfect`,
      emoji: '💎',
      name: `${gName} ${mName} Star`,
      desc: `Get a perfect ${mName.toLowerCase()} score at ${gName}`,
      check: d => (d.gradePerfects[key] || 0) >= 1,
    });
  });
});

function checkBadges() {
  let newBadges = [];
  BADGE_DEFS.forEach(b => {
    if (!persist.badges.includes(b.id) && b.check(persist)) {
      persist.badges.push(b.id);
      newBadges.push(b);
    }
  });
  GRADE_BADGE_DEFS.forEach(b => {
    if (!persist.gradeBadges.includes(b.id) && b.check(persist)) {
      persist.gradeBadges.push(b.id);
      newBadges.push(b);
    }
  });
  saveData();
  return newBadges;
}

function updateStreak() {
  const today = new Date().toISOString().split('T')[0];
  if (persist.lastPlayDate === today) return;

  if (persist.lastPlayDate) {
    const last = new Date(persist.lastPlayDate);
    const now = new Date(today);
    const diff = Math.floor((now - last) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      persist.streakDays++;
    } else if (diff > 1) {
      persist.streakDays = 1;
    }
  } else {
    persist.streakDays = 1;
  }
  persist.lastPlayDate = today;
  saveData();
}

// ====== SIGHT WORD BANKS ======
const WORDS = {
  prek: ['the','a','I','is','it','in','my','to','and','go','me','no','up','at','we','on','an','do','he','so','am','be','if','of','or','us','can','see','you','not','big','run','red','one','two','all','had','has','his','her','was','are','but','did','get','him','let','new','now','old','our','out','put','ran','say','she','too','yes','eat','hot','sit','top','fun','pet','hug','bed','cup','hat','pig','dog','cat','map','sun','bus','box','six','ten'],
  kinder: ['said','have','like','come','look','they','play','down','make','help','good','this','that','with','what','from','some','then','them','will','very','when','just','know','into','your','been','here','many','over','only','after','back','call','came','could','each','find','first','give','going','great','hand','high','house','jump','last','long','made','much','must','name','never','next','open','part','pick','read','right','same','show','small','start','tell','turn','walk','want','well','which','work','write','year','about','again','also','away','because','before','best','both','bring','clean','does','done','draw','drink','every','fall','fast','four','full','goes','green','grow','hold','keep','kind','left','light','live','most','move','myself','off','once','own','please','present','pull','round','shall','sing','sleep','stop','take','thank','think','today','together','try','upon','warm','wish','word','would'],
  first: ['every','could','after','where','other','people','there','world','through','because','should','before','really','animal','always','around','another','between','change','different','earth','enough','follow','house','important','large','learn','letter','mother','picture','point','school','something','thought','together','under','watch','while','young','above','begin','below','body','carry','city','close','country','door','early','family','father','girl','group','head','idea','leave','life','list','might','money','night','often','order','paper','place','plant','river','second','sentence','sometimes','still','story','study','those','three','until','water','woman'],
  second: ['because','always','which','would','about','their','people','other','could','write','there','these','number','water','first','after','where','through','different','before','should','between','another','around','again','world','important','something','thought','together','every','change','really','above','begin','below','carry','close','country','early','enough','example','family','father','group','leave','might','often','order','paper','place','second','sentence','sometimes','story','study','until','young','across','against','almost','already','among','answer','certain','complete','contain','cover','describe','direct','during','eight','either','except','happen','heard','instead','known','language','measure','minute','moment','morning','notice','passed','perhaps','picture','problem','product','question','reason','remember','several','simple','special','strong','sudden','surface','toward','travel','voice','weather','whether','whole']
};

// ====== MATH PROBLEM GENERATION ======
const MATH_LEVELS = {
  prek:   { name: 'Pre-K',        operations: ['+'],             range: [1,5],   resultMax: 10 },
  kinder: { name: 'Kindergarten', operations: ['+','−'],         range: [1,10],  resultMax: 20 },
  first:  { name: '1st Grade',   operations: ['+','−','×'],     range: [1,12],  multRange: [1,5],  resultMax: 30 },
  second: { name: '2nd Grade',   operations: ['+','−','×','÷'], range: [1,20],  multRange: [1,12], resultMax: 50 }
};

function generateMathProblem(level) {
  const cfg = MATH_LEVELS[level];
  const op = cfg.operations[Math.floor(Math.random() * cfg.operations.length)];
  let a, b, answer, display;
  switch (op) {
    case '+':
      a = randInt(cfg.range[0], cfg.range[1]);
      b = randInt(cfg.range[0], cfg.range[1]);
      if (a + b > cfg.resultMax) b = randInt(1, cfg.resultMax - a);
      answer = a + b;
      display = `${a} + ${b}`;
      break;
    case '−':
      a = randInt(cfg.range[0]+1, cfg.range[1]);
      b = randInt(cfg.range[0], a);
      answer = a - b;
      display = `${a} − ${b}`;
      break;
    case '×': {
      const mr = cfg.multRange || [1,5];
      a = randInt(mr[0], mr[1]);
      b = randInt(mr[0], mr[1]);
      answer = a * b;
      display = `${a} × ${b}`;
      break;
    }
    case '÷': {
      const dr = cfg.multRange || [1,5];
      b = randInt(dr[0], dr[1]);
      answer = randInt(1, dr[1]);
      a = b * answer;
      display = `${a} ÷ ${b}`;
      break;
    }
  }
  return { display, answer, operation: op };
}

// ====== MONEY PROBLEM GENERATION ======
const COINS = [
  { name: 'penny',   plural: 'pennies', value: 1,  symbol: '1¢'  },
  { name: 'nickel',  plural: 'nickels',  value: 5,  symbol: '5¢'  },
  { name: 'dime',    plural: 'dimes',    value: 10, symbol: '10¢' },
  { name: 'quarter', plural: 'quarters', value: 25, symbol: '25¢' },
];

function generateMoneyProblem(level) {
  switch(level) {
    case 'prek':   return generateCoinIdProblem();
    case 'kinder': return generateCoinCountProblem();
    case 'first':  return generateMakeChangeProblem();
    case 'second': return generateMoneyWordProblem();
    default:       return generateCoinIdProblem();
  }
}

function generateCoinIdProblem() {
  // "A ___ is worth ___¢" — pick the correct value
  const coin = COINS[randInt(0, 3)];
  const wrongValues = COINS.filter(c => c.value !== coin.value).map(c => c.value);
  const choices = shuffleArray([coin.value, ...wrongValues]);
  return {
    type: 'multiple_choice',
    prompt: `How much is a ${coin.name} worth?`,
    display: coin.name.toUpperCase(),
    choices: choices.map(v => v + '¢'),
    answer: coin.value + '¢',
    answerNum: coin.value,
    explanation: `A ${coin.name} = ${coin.value}¢`
  };
}

function generateCoinCountProblem() {
  // "How many cents?" with 2-3 coins
  const numCoins = randInt(2, 3);
  let total = 0;
  let parts = [];
  for (let i = 0; i < numCoins; i++) {
    const coin = COINS[randInt(0, 3)];
    total += coin.value;
    parts.push(coin.name);
  }
  return {
    type: 'number',
    prompt: 'How many cents in total?',
    display: parts.join(' + '),
    answer: total + '¢',
    answerNum: total,
    explanation: `${parts.join(' + ')} = ${total}¢`
  };
}

function generateMakeChangeProblem() {
  // "You have X¢. You spend Y¢. How much left?"
  const have = [25, 50, 75, 100][randInt(0, 3)];
  const spend = randInt(5, have - 5);
  // Round to nearest 5
  const spendRound = Math.round(spend / 5) * 5 || 5;
  const change = have - spendRound;
  return {
    type: 'number',
    prompt: `You have ${have}¢. You spend ${spendRound}¢. How much is left?`,
    display: `${have}¢ − ${spendRound}¢`,
    answer: change + '¢',
    answerNum: change,
    explanation: `${have}¢ − ${spendRound}¢ = ${change}¢`
  };
}

function generateMoneyWordProblem() {
  const type = randInt(0, 2);
  if (type === 0) {
    // Compare prices
    const items = ['apple', 'banana', 'cookie', 'juice', 'pencil', 'sticker', 'toy car', 'candy bar'];
    const i1 = randInt(0, items.length - 1);
    let i2 = randInt(0, items.length - 1);
    while (i2 === i1) i2 = randInt(0, items.length - 1);
    const p1 = randInt(1, 20) * 5; // 5¢ increments
    let p2 = randInt(1, 20) * 5;
    while (p2 === p1) p2 = randInt(1, 20) * 5;
    const more = p1 > p2 ? items[i1] : items[i2];
    return {
      type: 'multiple_choice',
      prompt: `${items[i1]} costs ${p1}¢. ${items[i2]} costs ${p2}¢. Which costs more?`,
      display: `${items[i1]} ${p1}¢  vs  ${items[i2]} ${p2}¢`,
      choices: [items[i1], items[i2]],
      answer: more,
      answerNum: null,
      explanation: `${more} costs more`
    };
  } else if (type === 1) {
    // Buy two items
    const p1 = randInt(2, 10) * 5;
    const p2 = randInt(2, 10) * 5;
    const total = p1 + p2;
    return {
      type: 'number',
      prompt: `You buy a snack for ${p1}¢ and a drink for ${p2}¢. How much total?`,
      display: `${p1}¢ + ${p2}¢`,
      answer: total + '¢',
      answerNum: total,
      explanation: `${p1}¢ + ${p2}¢ = ${total}¢`
    };
  } else {
    // Savings problem
    const perDay = [5, 10, 25][randInt(0, 2)];
    const days = randInt(2, 5);
    const total = perDay * days;
    return {
      type: 'number',
      prompt: `You save ${perDay}¢ each day for ${days} days. How much do you have?`,
      display: `${perDay}¢ × ${days} days`,
      answer: total + '¢',
      answerNum: total,
      explanation: `${perDay}¢ × ${days} = ${total}¢`
    };
  }
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ====== STATE ======
let state = {
  mode: null,        // 'math', 'reading', or 'money'
  level: 'prek',
  itemCount: 10,
  problems: [],      // math or money problems
  words: [],         // reading words
  currentWord: null,
  showDuration: 5,   // 5 seconds for reading
  currentIndex: 0,
  tickets: 0,
  correctCount: 0,
  missed: []
};

// ====== DOM REFS ======
const $ = id => document.getElementById(id);

// ====== SCREEN NAVIGATION ======
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

function showQuizStep(id) {
  document.querySelectorAll('.quiz-step').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

// ====== HOME SCREEN ======
function initHome() {
  renderStreakBar();
  renderBadgesSummary();
}

function renderStreakBar() {
  const el = $('streak-count');
  if (el) el.textContent = persist.streakDays;
  const ticketEl = $('home-tickets');
  if (ticketEl) ticketEl.textContent = persist.totalTickets;
}

function renderBadgesSummary() {
  const totalBadges = BADGE_DEFS.length + GRADE_BADGE_DEFS.length;
  const earnedBadges = persist.badges.length + persist.gradeBadges.length;
  const el = $('home-badge-count');
  if (el) el.textContent = `${earnedBadges} / ${totalBadges}`;
}

// Mode selection
document.addEventListener('click', (e) => {
  const modeCard = e.target.closest('[data-mode]');
  if (modeCard && modeCard.closest('#screen-home')) {
    state.mode = modeCard.dataset.mode;
    showScreen('screen-setup');
    initSetup();
  }
});

// Badges button
document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-badges')) {
    showScreen('screen-badges');
    renderBadgesScreen();
  }
  if (e.target.closest('#btn-badges-back')) {
    showScreen('screen-home');
  }
});

// ====== SETUP SCREEN ======
function initSetup() {
  const title = $('setup-title');
  const levelCards = $('level-select');

  if (state.mode === 'math') {
    title.textContent = 'Math Quiz';
    $('setup-item-label').textContent = 'Number of problems';
    levelCards.innerHTML = `
      <button class="level-card selected" role="radio" aria-checked="true" data-level="prek">
        <span class="level-emoji">🌱</span><span class="level-name">Pre-K</span><span class="level-desc">Addition 1–5</span>
      </button>
      <button class="level-card" role="radio" aria-checked="false" data-level="kinder">
        <span class="level-emoji">🌻</span><span class="level-name">Kindergarten</span><span class="level-desc">Add & Subtract 1–10</span>
      </button>
      <button class="level-card" role="radio" aria-checked="false" data-level="first">
        <span class="level-emoji">🌳</span><span class="level-name">1st Grade</span><span class="level-desc">+, −, × up to 12</span>
      </button>
      <button class="level-card" role="radio" aria-checked="false" data-level="second">
        <span class="level-emoji">🏔️</span><span class="level-name">2nd Grade</span><span class="level-desc">+, −, ×, ÷ up to 20</span>
      </button>`;
  } else if (state.mode === 'reading') {
    title.textContent = 'Sight Words';
    $('setup-item-label').textContent = 'Number of words';
    levelCards.innerHTML = `
      <button class="level-card selected" role="radio" aria-checked="true" data-level="prek">
        <span class="level-emoji">🌱</span><span class="level-name">Pre-K</span><span class="level-desc">the, a, is, it...</span>
      </button>
      <button class="level-card" role="radio" aria-checked="false" data-level="kinder">
        <span class="level-emoji">🌻</span><span class="level-name">Kindergarten</span><span class="level-desc">said, have, like...</span>
      </button>
      <button class="level-card" role="radio" aria-checked="false" data-level="first">
        <span class="level-emoji">🌳</span><span class="level-name">1st Grade</span><span class="level-desc">every, could, after...</span>
      </button>
      <button class="level-card" role="radio" aria-checked="false" data-level="second">
        <span class="level-emoji">🏔️</span><span class="level-name">2nd Grade</span><span class="level-desc">because, always, which...</span>
      </button>`;
  } else {
    title.textContent = 'Money Quiz';
    $('setup-item-label').textContent = 'Number of questions';
    levelCards.innerHTML = `
      <button class="level-card selected" role="radio" aria-checked="true" data-level="prek">
        <span class="level-emoji">🌱</span><span class="level-name">Pre-K</span><span class="level-desc">Coin values</span>
      </button>
      <button class="level-card" role="radio" aria-checked="false" data-level="kinder">
        <span class="level-emoji">🌻</span><span class="level-name">Kindergarten</span><span class="level-desc">Count coins</span>
      </button>
      <button class="level-card" role="radio" aria-checked="false" data-level="first">
        <span class="level-emoji">🌳</span><span class="level-name">1st Grade</span><span class="level-desc">Making change</span>
      </button>
      <button class="level-card" role="radio" aria-checked="false" data-level="second">
        <span class="level-emoji">🏔️</span><span class="level-name">2nd Grade</span><span class="level-desc">Word problems</span>
      </button>`;
  }

  state.level = 'prek';
  state.itemCount = 10;
  $('item-count').textContent = state.itemCount;

  // Level card clicks
  levelCards.addEventListener('click', (e) => {
    const card = e.target.closest('.level-card');
    if (!card) return;
    levelCards.querySelectorAll('.level-card').forEach(c => {
      c.classList.remove('selected');
      c.setAttribute('aria-checked', 'false');
    });
    card.classList.add('selected');
    card.setAttribute('aria-checked', 'true');
    state.level = card.dataset.level;
  });
}

// Stepper
document.addEventListener('click', (e) => {
  if (e.target.closest('#count-down')) {
    state.itemCount = Math.max(5, state.itemCount - 5);
    $('item-count').textContent = state.itemCount;
  }
  if (e.target.closest('#count-up')) {
    state.itemCount = Math.min(30, state.itemCount + 5);
    $('item-count').textContent = state.itemCount;
  }
});

// Start quiz
document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-start')) {
    startQuiz();
  }
});

// Back to home from setup
document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-setup-back')) {
    showScreen('screen-home');
  }
});

// ====== QUIZ LOGIC ======
let countdownInterval = null;

function startQuiz() {
  state.currentIndex = 0;
  state.tickets = 0;
  state.correctCount = 0;
  state.missed = [];

  if (state.mode === 'math') {
    state.problems = [];
    for (let i = 0; i < state.itemCount; i++) {
      state.problems.push(generateMathProblem(state.level));
    }
  } else if (state.mode === 'money') {
    state.problems = [];
    for (let i = 0; i < state.itemCount; i++) {
      state.problems.push(generateMoneyProblem(state.level));
    }
  } else {
    const pool = WORDS[state.level] || WORDS.prek;
    state.words = shuffleArray(pool).slice(0, state.itemCount);
  }

  showScreen('screen-quiz');
  // Hide choice area at the start
  $('choice-area').style.display = 'none';
  $('choice-area').innerHTML = '';
  updateProgress();
  showItem();
}

function getTotal() {
  if (state.mode === 'reading') return state.words.length;
  return state.problems.length;
}

function updateProgress() {
  const total = getTotal();
  $('progress-text').textContent = `${state.currentIndex + 1} / ${total}`;
  $('ticket-display').textContent = state.tickets;
  const pct = (state.currentIndex / total) * 100;
  $('progress-bar').style.width = pct + '%';
}

function showItem() {
  // Hide choice area by default
  $('choice-area').style.display = 'none';
  $('choice-area').innerHTML = '';

  if (state.mode === 'math') {
    showMathProblem();
  } else if (state.mode === 'money') {
    showMoneyProblem();
  } else {
    showReadingWord();
  }
}

// --- Math mode ---
function showMathProblem() {
  const problem = state.problems[state.currentIndex];
  $('quiz-prompt-solve').textContent = 'Solve this problem:';
  $('display-area-solve').textContent = `${problem.display} = ?`;
  $('display-area-solve').className = 'problem-display';
  showQuizStep('quiz-solve');

  const input = $('answer-input');
  input.type = 'number';
  input.inputMode = 'numeric';
  input.placeholder = '?';
  input.value = '';
  input.className = 'answer-input';
  input.style.display = '';
  $('btn-check').style.display = '';
  $('hint-area').innerHTML = '';
  input.focus();
}

// --- Money mode ---
function showMoneyProblem() {
  const problem = state.problems[state.currentIndex];
  $('quiz-prompt-solve').textContent = problem.prompt;
  $('display-area-solve').textContent = problem.display;
  $('display-area-solve').className = 'problem-display money-display';
  showQuizStep('quiz-solve');

  const input = $('answer-input');
  $('hint-area').innerHTML = '';

  if (problem.type === 'multiple_choice') {
    // Hide text input, show choice buttons
    input.style.display = 'none';
    $('btn-check').style.display = 'none';
    const choiceArea = $('choice-area');
    choiceArea.style.display = 'grid';
    choiceArea.innerHTML = problem.choices.map(c =>
      `<button class="choice-btn" data-choice="${c}">${c}</button>`
    ).join('');
  } else {
    input.style.display = '';
    $('btn-check').style.display = '';
    input.type = 'number';
    input.inputMode = 'numeric';
    input.placeholder = '¢';
    input.value = '';
    input.className = 'answer-input';
    input.focus();
  }
}

// Choice button handler
document.addEventListener('click', (e) => {
  const choiceBtn = e.target.closest('.choice-btn');
  if (!choiceBtn || !$('quiz-solve').classList.contains('active')) return;
  if (state.mode !== 'money') return;

  const problem = state.problems[state.currentIndex];
  const chosen = choiceBtn.dataset.choice;
  const correct = chosen === problem.answer;

  // Highlight buttons
  document.querySelectorAll('.choice-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.choice === problem.answer) {
      btn.classList.add('correct');
    } else if (btn === choiceBtn && !correct) {
      btn.classList.add('wrong');
    }
  });

  if (correct) {
    state.correctCount++;
    state.tickets++;
  } else {
    state.missed.push({
      display: problem.display,
      correctAnswer: problem.answer,
      userAnswer: chosen
    });
  }

  setTimeout(() => showResult(correct, problem.explanation), 500);
});

// --- Reading mode ---
function showReadingWord() {
  const word = state.words[state.currentIndex];
  state.currentWord = word;
  $('quiz-prompt').textContent = 'Read this word carefully:';
  $('display-area').textContent = word;
  $('display-area').className = 'word-display';
  showQuizStep('quiz-show-word');

  // Countdown
  let count = state.showDuration;
  $('countdown-number').textContent = count;
  const circumference = 276.46;
  const ring = $('ring-circle');
  ring.style.transition = 'none';
  ring.style.strokeDashoffset = '0';
  ring.getBoundingClientRect();
  ring.style.transition = 'stroke-dashoffset 1s linear';

  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      $('countdown-number').textContent = count;
      ring.style.strokeDashoffset = ((state.showDuration - count) / state.showDuration) * circumference;
    } else {
      clearInterval(countdownInterval);
      countdownInterval = null;
      ring.style.strokeDashoffset = circumference;
      switchToTypeStep();
    }
  }, 1000);
}

function switchToTypeStep() {
  $('quiz-prompt-solve').textContent = 'Now type the word:';
  $('display-area-solve').textContent = '';
  $('display-area-solve').className = 'word-display';
  showQuizStep('quiz-solve');

  const input = $('answer-input');
  input.style.display = '';
  $('btn-check').style.display = '';
  input.type = 'text';
  input.inputMode = 'text';
  input.placeholder = 'Type the word...';
  input.value = '';
  input.className = 'answer-input';
  $('hint-area').innerHTML = '<button class="btn-hint" id="btn-hint">Show me a hint</button>';
  input.focus();
}

// Hint
document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-hint') && state.mode === 'reading') {
    const word = state.currentWord;
    const hint = word[0] + ' ' + '_ '.repeat(word.length - 1).trim();
    $('hint-area').innerHTML = `<span class="hint-text">${hint}</span>`;
  }
});

// ====== CHECK ANSWER ======
function checkAnswer() {
  const input = $('answer-input');
  const userAnswer = input.value.trim();
  if (userAnswer === '') return;

  let correct;
  let displayCorrect;

  if (state.mode === 'math') {
    const problem = state.problems[state.currentIndex];
    correct = parseInt(userAnswer, 10) === problem.answer;
    displayCorrect = `${problem.display} = ${problem.answer}`;
  } else if (state.mode === 'money') {
    const problem = state.problems[state.currentIndex];
    const numAnswer = parseInt(userAnswer, 10);
    correct = numAnswer === problem.answerNum;
    displayCorrect = problem.explanation;
  } else {
    correct = userAnswer.toLowerCase() === state.currentWord.toLowerCase();
    displayCorrect = state.currentWord;
  }

  if (correct) {
    input.className = 'answer-input correct';
    state.correctCount++;
    state.tickets++;
  } else {
    input.className = 'answer-input wrong';
    if (state.mode === 'money') {
      const problem = state.problems[state.currentIndex];
      state.missed.push({
        display: problem.display,
        correctAnswer: problem.answer,
        userAnswer
      });
    } else if (state.mode === 'math') {
      state.missed.push({
        display: state.problems[state.currentIndex].display,
        correctAnswer: state.problems[state.currentIndex].answer,
        userAnswer
      });
    } else {
      state.missed.push({
        display: state.currentWord,
        correctAnswer: state.currentWord,
        userAnswer
      });
    }
  }

  setTimeout(() => showResult(correct, displayCorrect), 400);
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-check')) checkAnswer();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && $('quiz-solve').classList.contains('active')) checkAnswer();
});

// ====== RESULT ======
function showResult(correct, displayCorrect) {
  showQuizStep('quiz-result');

  $('result-icon').textContent = correct ? '🎉' : '😊';
  $('result-message').textContent = correct ? 'Correct!' : 'Not quite!';
  $('result-message').className = 'result-message ' + (correct ? 'correct' : 'wrong');

  if (state.mode === 'math') {
    $('result-detail').textContent = displayCorrect;
  } else if (state.mode === 'money') {
    $('result-detail').textContent = displayCorrect;
  } else {
    $('result-detail').textContent = correct ? `"${displayCorrect}"` : `The word was "${displayCorrect}"`;
  }

  $('ticket-earned').className = correct ? 'ticket-earned show' : 'ticket-earned';
  $('ticket-display').textContent = state.tickets;

  const total = getTotal();
  const isLast = state.currentIndex >= total - 1;
  if (isLast) {
    $('btn-next').textContent = 'See Results';
  } else {
    const labels = { math: 'Next Problem', reading: 'Next Word', money: 'Next Question' };
    $('btn-next').textContent = labels[state.mode] || 'Next';
  }
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-next')) {
    state.currentIndex++;
    const total = getTotal();
    if (state.currentIndex >= total) {
      finishQuiz();
    } else {
      updateProgress();
      showItem();
    }
  }
});

// ====== FINISH QUIZ & SUMMARY ======
function finishQuiz() {
  const total = getTotal();
  const pct = state.correctCount / total;
  const isPerfect = pct >= 1;

  // Update persistent data
  persist.totalQuizzes++;
  persist.totalCorrect += state.correctCount;
  persist.totalTickets += state.tickets;
  if (isPerfect) persist.perfectQuizzes++;

  if (state.mode === 'math') persist.mathQuizzes++;
  else if (state.mode === 'reading') persist.readingQuizzes++;
  else if (state.mode === 'money') persist.moneyQuizzes++;

  // Per-grade tracking
  const gradeKey = `${state.mode}_${state.level}`;
  persist.gradeQuizzes[gradeKey] = (persist.gradeQuizzes[gradeKey] || 0) + 1;
  if (isPerfect) {
    persist.gradePerfects[gradeKey] = (persist.gradePerfects[gradeKey] || 0) + 1;
  }

  updateStreak();
  const newBadges = checkBadges();

  showScreen('screen-summary');

  const starCount = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct >= 0.3 ? 1 : 0;
  $('summary-stars').textContent = '⭐'.repeat(starCount) + '☆'.repeat(3 - starCount);

  const modeMessages = {
    math: { great: 'You really know your math!', low: 'Every problem you solve counts!' },
    reading: { great: 'You really know your words!', low: 'Every word you learn counts!' },
    money: { great: 'You really know your money!', low: 'Every coin counts!' }
  };
  const msgs = modeMessages[state.mode] || modeMessages.math;

  if (pct >= 0.9) {
    $('summary-title').textContent = 'Amazing!';
    $('summary-subtitle').textContent = msgs.great;
  } else if (pct >= 0.6) {
    $('summary-title').textContent = 'Great Job!';
    $('summary-subtitle').textContent = 'Keep practicing and you\'ll be a pro!';
  } else if (pct >= 0.3) {
    $('summary-title').textContent = 'Good Try!';
    $('summary-subtitle').textContent = 'Practice makes perfect!';
  } else {
    $('summary-title').textContent = 'Keep Going!';
    $('summary-subtitle').textContent = msgs.low;
  }

  animateNumber($('stat-correct'), state.correctCount);
  animateNumber($('stat-total'), total);
  animateNumber($('stat-tickets'), state.tickets);

  const screenMinutes = state.tickets * 2;
  $('time-display').textContent = `${screenMinutes} minute${screenMinutes !== 1 ? 's' : ''}`;
  $('screen-time-box').style.display = state.tickets > 0 ? '' : 'none';

  // Missed items
  const missedSection = $('missed-section');
  const missedList = $('missed-list');
  if (state.missed.length > 0) {
    missedSection.style.display = '';
    const missedLabels = { math: 'Problems to Practice', reading: 'Words to Practice', money: 'Questions to Review' };
    $('missed-label').textContent = missedLabels[state.mode] || 'To Practice';
    missedList.innerHTML = state.missed.map(m => {
      let text;
      if (state.mode === 'math') text = `${m.display} = ${m.correctAnswer}`;
      else if (state.mode === 'money') text = `${m.correctAnswer}`;
      else text = m.correctAnswer;
      return `<span class="missed-word">${text}</span>`;
    }).join('');
  } else {
    missedSection.style.display = 'none';
    launchConfetti();
  }

  // New badges
  const badgeBox = $('new-badges');
  if (newBadges.length > 0) {
    badgeBox.style.display = '';
    badgeBox.innerHTML = '<h3>New Badges Earned</h3><div class="new-badge-list">' +
      newBadges.map(b => `<div class="badge-item earned"><span class="badge-emoji">${b.emoji}</span><span class="badge-name">${b.name}</span></div>`).join('') +
      '</div>';
  } else {
    badgeBox.style.display = 'none';
  }

  $('progress-bar').style.width = '100%';
}

function animateNumber(el, target) {
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 20));
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(interval);
  }, 30);
}

// ====== SUMMARY ACTIONS ======
document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-play-again')) startQuiz();
  if (e.target.closest('#btn-change-level')) showScreen('screen-setup');
  if (e.target.closest('#btn-go-home')) {
    showScreen('screen-home');
    initHome();
  }
});

// ====== SCREEN TIME TIMER ======
let timerInterval = null;
let timerRemaining = 0;
let timerTotal = 0;

document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-start-timer')) {
    timerTotal = state.tickets * 2 * 60;
    timerRemaining = timerTotal;
    $('timer-overlay').classList.add('active');
    $('timer-status').textContent = 'Screen time remaining';
    $('timer-status').className = 'timer-status';
    $('btn-timer-done').textContent = 'End Timer';
    startTimerCountdown();
  }
  if (e.target.closest('#btn-timer-done')) {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    $('timer-overlay').classList.remove('active');
    $('timer-ring-fill').style.stroke = 'var(--color-gold)';
  }
});

function startTimerCountdown() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerRemaining--;
    updateTimerDisplay();
    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      $('timer-status').textContent = 'Time\'s up!';
      $('timer-status').className = 'timer-status done';
      $('btn-timer-done').textContent = 'Done';
      $('timer-ring-fill').style.stroke = 'var(--color-error)';
    }
  }, 1000);
}

function updateTimerDisplay() {
  const min = Math.floor(timerRemaining / 60);
  const sec = timerRemaining % 60;
  $('timer-minutes').textContent = String(min).padStart(2, '0');
  $('timer-seconds').textContent = String(sec).padStart(2, '0');
  const circumference = 565.49;
  $('timer-ring-fill').style.strokeDashoffset = ((timerTotal - timerRemaining) / timerTotal) * circumference;
}

// ====== BADGES SCREEN ======
let badgeTab = 'overall';

function renderBadgesScreen() {
  badgeTab = 'overall';
  renderBadgeTabs();
  renderBadgeContent();
}

function renderBadgeTabs() {
  const tabs = $('badge-tabs');
  if (!tabs) return;
  tabs.innerHTML = `
    <button class="badge-tab ${badgeTab === 'overall' ? 'active' : ''}" data-badge-tab="overall">Overall</button>
    <button class="badge-tab ${badgeTab === 'grade' ? 'active' : ''}" data-badge-tab="grade">Per Grade</button>
  `;
}

function renderBadgeContent() {
  const grid = $('badges-grid');
  if (badgeTab === 'overall') {
    grid.innerHTML = BADGE_DEFS.map(b => {
      const earned = persist.badges.includes(b.id);
      return `<div class="badge-item ${earned ? 'earned' : 'locked'}">
        <span class="badge-emoji">${earned ? b.emoji : '🔒'}</span>
        <span class="badge-name">${b.name}</span>
        <span class="badge-desc">${b.desc}</span>
      </div>`;
    }).join('');
  } else {
    // Group by grade
    let html = '';
    GRADE_LEVELS.forEach(grade => {
      const gradeBadges = GRADE_BADGE_DEFS.filter(b => b.id.includes(`_${grade}_`));
      html += `<div class="grade-badge-section">
        <h3 class="grade-badge-title">${GRADE_EMOJIS[grade]} ${GRADE_NAMES[grade]}</h3>
        <div class="grade-badge-grid">`;
      gradeBadges.forEach(b => {
        const earned = persist.gradeBadges.includes(b.id);
        html += `<div class="badge-item small ${earned ? 'earned' : 'locked'}">
          <span class="badge-emoji">${earned ? b.emoji : '🔒'}</span>
          <span class="badge-name">${b.name}</span>
          <span class="badge-desc">${b.desc}</span>
        </div>`;
      });
      html += `</div></div>`;
    });
    grid.innerHTML = html;
  }
}

// Badge tab clicks
document.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-badge-tab]');
  if (tab) {
    badgeTab = tab.dataset.badgeTab;
    renderBadgeTabs();
    renderBadgeContent();
  }
});

// ====== CONFETTI ======
function launchConfetti() {
  const colors = ['#4A7CFF', '#F5A623', '#34A853', '#E8453C', '#9B59B6', '#FF6B9D'];
  for (let i = 0; i < 40; i++) {
    setTimeout(() => {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.top = '-10px';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = (1 + Math.random()) + 's';
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 2000);
    }, i * 40);
  }
}

// ====== DARK MODE ======
(function() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
})();

// ====== INIT ======
initHome();
