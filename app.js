// ====== MATH PROBLEM GENERATION ======

// Grade-level configs: what operations and number ranges are available
const LEVELS = {
  prek: {
    name: 'Pre-K',
    operations: ['+'],
    range: [1, 5],       // numbers 1–5
    resultMax: 10
  },
  kinder: {
    name: 'Kindergarten',
    operations: ['+', '−'],
    range: [1, 10],
    resultMax: 20
  },
  first: {
    name: '1st Grade',
    operations: ['+', '−', '×'],
    range: [1, 12],
    multRange: [1, 5],   // multiplication kept simpler
    resultMax: 30
  },
  second: {
    name: '2nd Grade',
    operations: ['+', '−', '×', '÷'],
    range: [1, 20],
    multRange: [1, 12],
    resultMax: 50
  }
};

function generateProblem(level) {
  const cfg = LEVELS[level];
  const op = cfg.operations[Math.floor(Math.random() * cfg.operations.length)];
  let a, b, answer, display;

  switch (op) {
    case '+': {
      a = randInt(cfg.range[0], cfg.range[1]);
      b = randInt(cfg.range[0], cfg.range[1]);
      // keep result within max
      if (a + b > cfg.resultMax) {
        b = randInt(1, cfg.resultMax - a);
      }
      answer = a + b;
      display = `${a} + ${b}`;
      break;
    }
    case '−': {
      // ensure a >= b so no negatives
      a = randInt(cfg.range[0] + 1, cfg.range[1]);
      b = randInt(cfg.range[0], a);
      answer = a - b;
      display = `${a} − ${b}`;
      break;
    }
    case '×': {
      const mr = cfg.multRange || [1, 5];
      a = randInt(mr[0], mr[1]);
      b = randInt(mr[0], mr[1]);
      answer = a * b;
      display = `${a} × ${b}`;
      break;
    }
    case '÷': {
      // generate as multiplication then reverse
      const dr = cfg.multRange || [1, 5];
      b = randInt(dr[0], dr[1]);
      answer = randInt(1, dr[1]);
      a = b * answer; // always divides evenly
      display = `${a} ÷ ${b}`;
      break;
    }
  }

  return { display, answer, operation: op };
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ====== STATE ======
let state = {
  level: 'prek',
  problemCount: 10,
  problems: [],
  currentIndex: 0,
  tickets: 0,
  correctCount: 0,
  missed: [] // { display, correctAnswer, userAnswer }
};

// ====== DOM REFS ======
const $ = id => document.getElementById(id);

const screenWelcome = $('screen-welcome');
const screenQuiz = $('screen-quiz');
const screenSummary = $('screen-summary');

const levelCards = document.querySelectorAll('.level-card');
const wordCountEl = $('word-count');
const btnCountDown = $('count-down');
const btnCountUp = $('count-up');
const btnStart = $('btn-start');

const progressText = $('progress-text');
const ticketDisplay = $('ticket-display');
const progressBar = $('progress-bar');
const problemDisplay = $('problem-display');
const answerInput = $('answer-input');
const btnCheck = $('btn-check');
const hintArea = $('hint-area');
const quizSolve = $('quiz-solve');
const quizResult = $('quiz-result');
const resultIcon = $('result-icon');
const resultMessage = $('result-message');
const resultDetail = $('result-detail');
const ticketEarned = $('ticket-earned');
const btnNext = $('btn-next');

const summaryStars = $('summary-stars');
const summaryTitle = $('summary-title');
const summarySubtitle = $('summary-subtitle');
const statCorrect = $('stat-correct');
const statTotal = $('stat-total');
const statTickets = $('stat-tickets');
const timeDisplay = $('time-display');
const btnStartTimer = $('btn-start-timer');
const timerOverlay = $('timer-overlay');
const timerMinutes = $('timer-minutes');
const timerSeconds = $('timer-seconds');
const timerRingFill = $('timer-ring-fill');
const timerStatus = $('timer-status');
const btnTimerDone = $('btn-timer-done');
const missedSection = $('missed-words-section');
const missedList = $('missed-list');
const btnPlayAgain = $('btn-play-again');
const btnChangeLevel = $('btn-change-level');
const screenTimeBox = $('screen-time-box');

// ====== HELPERS ======
function showScreen(screen) {
  [screenWelcome, screenQuiz, screenSummary].forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

function showQuizStep(step) {
  [quizSolve, quizResult].forEach(s => s.classList.remove('active'));
  step.classList.add('active');
}

function updateProgress() {
  progressText.textContent = `${state.currentIndex + 1} / ${state.problems.length}`;
  ticketDisplay.textContent = state.tickets;
  const pct = ((state.currentIndex) / state.problems.length) * 100;
  progressBar.style.width = pct + '%';
}

// ====== WELCOME SCREEN LOGIC ======
levelCards.forEach(card => {
  card.addEventListener('click', () => {
    levelCards.forEach(c => {
      c.classList.remove('selected');
      c.setAttribute('aria-checked', 'false');
    });
    card.classList.add('selected');
    card.setAttribute('aria-checked', 'true');
    state.level = card.dataset.level;
  });
});

btnCountDown.addEventListener('click', () => {
  state.problemCount = Math.max(5, state.problemCount - 5);
  wordCountEl.textContent = state.problemCount;
});

btnCountUp.addEventListener('click', () => {
  state.problemCount = Math.min(30, state.problemCount + 5);
  wordCountEl.textContent = state.problemCount;
});

btnStart.addEventListener('click', startQuiz);

// ====== QUIZ LOGIC ======
function startQuiz() {
  // Generate all problems upfront
  state.problems = [];
  for (let i = 0; i < state.problemCount; i++) {
    state.problems.push(generateProblem(state.level));
  }
  state.currentIndex = 0;
  state.tickets = 0;
  state.correctCount = 0;
  state.missed = [];

  showScreen(screenQuiz);
  updateProgress();
  showProblem();
}

function showProblem() {
  const problem = state.problems[state.currentIndex];
  problemDisplay.textContent = `${problem.display} = ?`;
  showQuizStep(quizSolve);
  answerInput.value = '';
  answerInput.className = 'answer-input';
  hintArea.innerHTML = '';
  answerInput.focus();
}

// ====== CHECK ANSWER ======
function checkAnswer() {
  const problem = state.problems[state.currentIndex];
  const userAnswer = answerInput.value.trim();

  if (userAnswer === '') return; // ignore empty

  const correct = parseInt(userAnswer, 10) === problem.answer;

  if (correct) {
    answerInput.className = 'answer-input correct';
    state.correctCount++;
    state.tickets++;
  } else {
    answerInput.className = 'answer-input wrong';
    state.missed.push({
      display: problem.display,
      correctAnswer: problem.answer,
      userAnswer: userAnswer
    });
  }

  setTimeout(() => showResult(correct, problem), 400);
}

btnCheck.addEventListener('click', checkAnswer);
answerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') checkAnswer();
});

// ====== RESULT DISPLAY ======
function showResult(correct, problem) {
  showQuizStep(quizResult);

  if (correct) {
    resultIcon.textContent = '🎉';
    resultMessage.textContent = 'Correct!';
    resultMessage.className = 'result-message correct';
    resultDetail.textContent = `${problem.display} = ${problem.answer}`;
    ticketEarned.className = 'ticket-earned show';
    ticketDisplay.textContent = state.tickets;
  } else {
    resultIcon.textContent = '😊';
    resultMessage.textContent = "Not quite!";
    resultMessage.className = 'result-message wrong';
    resultDetail.textContent = `${problem.display} = ${problem.answer}`;
    ticketEarned.className = 'ticket-earned';
  }

  if (state.currentIndex >= state.problems.length - 1) {
    btnNext.textContent = 'See Results';
  } else {
    btnNext.textContent = 'Next Problem';
  }
}

btnNext.addEventListener('click', () => {
  state.currentIndex++;
  if (state.currentIndex >= state.problems.length) {
    showSummary();
  } else {
    updateProgress();
    showProblem();
  }
});

// ====== SUMMARY LOGIC ======
function showSummary() {
  showScreen(screenSummary);

  const pct = state.correctCount / state.problems.length;
  const starCount = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct >= 0.3 ? 1 : 0;

  summaryStars.textContent = '⭐'.repeat(starCount) + '☆'.repeat(3 - starCount);

  if (pct >= 0.9) {
    summaryTitle.textContent = 'Amazing!';
    summarySubtitle.textContent = 'You really know your math!';
  } else if (pct >= 0.6) {
    summaryTitle.textContent = 'Great Job!';
    summarySubtitle.textContent = 'Keep practicing and you\'ll be a pro!';
  } else if (pct >= 0.3) {
    summaryTitle.textContent = 'Good Try!';
    summarySubtitle.textContent = 'Practice makes perfect!';
  } else {
    summaryTitle.textContent = 'Keep Going!';
    summarySubtitle.textContent = 'Every problem you solve counts!';
  }

  animateNumber(statCorrect, state.correctCount);
  animateNumber(statTotal, state.problems.length);
  animateNumber(statTickets, state.tickets);

  const screenMinutes = state.tickets * 2;
  timeDisplay.textContent = `${screenMinutes} minute${screenMinutes !== 1 ? 's' : ''}`;

  if (state.tickets > 0) {
    screenTimeBox.style.display = '';
  } else {
    screenTimeBox.style.display = 'none';
  }

  if (state.missed.length > 0) {
    missedSection.style.display = '';
    missedList.innerHTML = state.missed.map(m =>
      `<span class="missed-word">${m.display} = ${m.correctAnswer}</span>`
    ).join('');
  } else {
    missedSection.style.display = 'none';
    launchConfetti();
  }

  progressBar.style.width = '100%';
}

function animateNumber(el, target) {
  let current = 0;
  const duration = 600;
  const step = Math.max(1, Math.ceil(target / (duration / 30)));
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(interval);
  }, 30);
}

// ====== SCREEN TIME TIMER ======
let timerInterval = null;
let timerRemaining = 0;
let timerTotal = 0;

btnStartTimer.addEventListener('click', () => {
  timerTotal = state.tickets * 2 * 60;
  timerRemaining = timerTotal;
  timerOverlay.classList.add('active');
  timerStatus.textContent = 'Screen time remaining';
  timerStatus.className = 'timer-status';
  btnTimerDone.textContent = 'End Timer';
  startTimerCountdown();
});

function startTimerCountdown() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerRemaining--;
    updateTimerDisplay();

    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerStatus.textContent = 'Time\'s up!';
      timerStatus.className = 'timer-status done';
      btnTimerDone.textContent = 'Done';
      timerRingFill.style.stroke = 'var(--color-error)';
    }
  }, 1000);
}

function updateTimerDisplay() {
  const min = Math.floor(timerRemaining / 60);
  const sec = timerRemaining % 60;
  timerMinutes.textContent = String(min).padStart(2, '0');
  timerSeconds.textContent = String(sec).padStart(2, '0');

  const circumference = 565.49;
  const offset = ((timerTotal - timerRemaining) / timerTotal) * circumference;
  timerRingFill.style.strokeDashoffset = offset;
}

btnTimerDone.addEventListener('click', () => {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  timerOverlay.classList.remove('active');
  timerRingFill.style.stroke = 'var(--color-gold)';
});

// ====== PLAY AGAIN / CHANGE LEVEL ======
btnPlayAgain.addEventListener('click', () => {
  startQuiz();
});

btnChangeLevel.addEventListener('click', () => {
  showScreen(screenWelcome);
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
      piece.style.animationDelay = '0ms';
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 2000);
    }, i * 40);
  }
}

// ====== DARK MODE ======
(function() {
  const html = document.documentElement;
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  html.setAttribute('data-theme', isDark ? 'dark' : 'light');
})();
