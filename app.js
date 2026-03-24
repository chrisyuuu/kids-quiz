// ====== SIGHT WORD BANKS ======
const WORDS = {
  prek: ['the','a','I','is','it','in','my','to','and','go','me','no','up','at','we','on','an','do','he','so','am','be','if','of','or','us','can','see','you','not','big','run','red','one','two','all','had','has','his','her','was','are','but','did','get','him','let','new','now','old','our','out','put','ran','say','she','too','yes','eat','hot','sit','top','fun','pet','hug','bed','cup','hat','pig','dog','cat','map','sun','bus','box','six','ten'],
  kinder: ['said','have','like','come','look','they','play','down','make','help','good','this','that','with','what','from','some','then','them','will','very','when','just','know','into','your','been','here','many','over','only','after','back','call','came','could','each','find','first','give','going','great','hand','high','house','jump','last','long','made','much','must','name','never','next','open','part','pick','read','right','same','show','small','start','tell','turn','walk','want','well','which','work','write','year','about','again','also','away','because','before','best','both','bring','clean','does','done','draw','drink','every','fall','fast','four','full','goes','green','grow','hold','keep','kind','left','light','live','most','move','myself','off','once','own','pick','please','present','pull','round','shall','sing','sleep','stop','take','thank','think','today','together','try','upon','warm','wish','word','would'],
  first: ['every','could','after','where','other','people','there','world','through','because','should','before','really','animal','always','around','another','between','change','different','earth','enough','follow','house','important','large','learn','letter','mother','picture','point','school','should','something','thought','together','under','watch','while','young','above','begin','below','body','carry','city','close','country','door','early','enough','example','family','father','girl','group','hand','head','idea','leave','life','list','might','money','night','often','order','paper','place','plant','river','second','sentence','sometimes','still','story','study','those','three','under','until','water','woman','young'],
  second: ['because','always','which','would','about','their','people','other','could','write','there','these','number','water','first','after','where','through','different','before','should','between','another','around','again','world','important','something','thought','together','every','change','really','above','begin','below','carry','close','country','early','enough','example','family','father','group','leave','might','often','order','paper','place','second','sentence','sometimes','story','study','until','young','across','against','almost','already','among','answer','certain','complete','contain','cover','describe','direct','during','eight','either','except','happen','heard','instead','known','language','measure','minute','moment','morning','notice','passed','perhaps','picture','problem','product','question','reason','remember','several','simple','special','strong','sudden','surface','toward','travel','voice','weather','whether','whole']
};

// ====== STATE ======
let state = {
  level: 'prek',
  wordCount: 10,
  words: [],
  currentIndex: 0,
  tickets: 0,
  correctCount: 0,
  missed: [],
  showDuration: 3000 // ms to show word
};

// ====== DOM REFS ======
const $ = id => document.getElementById(id);

// Screens
const screenWelcome = $('screen-welcome');
const screenQuiz = $('screen-quiz');
const screenSummary = $('screen-summary');

// Welcome elements
const levelCards = document.querySelectorAll('.level-card');
const wordCountEl = $('word-count');
const btnCountDown = $('count-down');
const btnCountUp = $('count-up');
const btnStart = $('btn-start');

// Quiz elements
const progressText = $('progress-text');
const ticketDisplay = $('ticket-display');
const progressBar = $('progress-bar');
const quizShow = $('quiz-show');
const quizType = $('quiz-type');
const quizResult = $('quiz-result');
const wordDisplay = $('word-display');
const countdownNumber = $('countdown-number');
const ringCircle = $('ring-circle');
const wordInput = $('word-input');
const btnCheck = $('btn-check');
const btnHint = $('btn-hint');
const hintArea = $('hint-area');
const resultIcon = $('result-icon');
const resultMessage = $('result-message');
const resultWord = $('result-word');
const ticketEarned = $('ticket-earned');
const btnNext = $('btn-next');

// Summary elements
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
  [quizShow, quizType, quizResult].forEach(s => s.classList.remove('active'));
  step.classList.add('active');
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function updateProgress() {
  progressText.textContent = `${state.currentIndex + 1} / ${state.words.length}`;
  ticketDisplay.textContent = state.tickets;
  const pct = ((state.currentIndex) / state.words.length) * 100;
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
  state.wordCount = Math.max(5, state.wordCount - 5);
  wordCountEl.textContent = state.wordCount;
});

btnCountUp.addEventListener('click', () => {
  state.wordCount = Math.min(30, state.wordCount + 5);
  wordCountEl.textContent = state.wordCount;
});

btnStart.addEventListener('click', startQuiz);

// ====== QUIZ LOGIC ======
function startQuiz() {
  // Pick random words
  const pool = WORDS[state.level] || WORDS.prek;
  state.words = shuffleArray(pool).slice(0, state.wordCount);
  state.currentIndex = 0;
  state.tickets = 0;
  state.correctCount = 0;
  state.missed = [];

  showScreen(screenQuiz);
  updateProgress();
  showWord();
}

function showWord() {
  const word = state.words[state.currentIndex];
  wordDisplay.textContent = word;
  showQuizStep(quizShow);

  // Countdown timer
  let count = 3;
  countdownNumber.textContent = count;
  const circumference = 276.46;
  ringCircle.style.strokeDashoffset = '0';

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownNumber.textContent = count;
      ringCircle.style.strokeDashoffset = ((3 - count) / 3) * circumference;
    } else {
      clearInterval(interval);
      ringCircle.style.strokeDashoffset = circumference;
      // Switch to type mode
      wordDisplay.textContent = '';
      showQuizStep(quizType);
      wordInput.value = '';
      wordInput.className = 'word-input';
      hintArea.innerHTML = '<button class="btn-hint" id="btn-hint">Show me a hint</button>';
      document.getElementById('btn-hint').addEventListener('click', showHint);
      wordInput.focus();
    }
  }, 1000);
}

function showHint() {
  const word = state.words[state.currentIndex];
  // Show first letter + underscores
  const hint = word[0] + ' ' + '_ '.repeat(word.length - 1).trim();
  hintArea.innerHTML = `<span class="hint-text">${hint}</span>`;
}

function checkAnswer() {
  const word = state.words[state.currentIndex];
  const answer = wordInput.value.trim().toLowerCase();
  const correct = answer === word.toLowerCase();

  if (correct) {
    wordInput.className = 'word-input correct';
    state.correctCount++;
    state.tickets++;
  } else {
    wordInput.className = 'word-input wrong';
    state.missed.push(word);
  }

  // Show result after brief delay
  setTimeout(() => showResult(correct, word), 500);
}

function showResult(correct, word) {
  showQuizStep(quizResult);

  if (correct) {
    resultIcon.textContent = '🎉';
    resultMessage.textContent = 'Correct!';
    resultMessage.className = 'result-message correct';
    resultWord.textContent = `"${word}"`;
    ticketEarned.className = 'ticket-earned show';
    ticketDisplay.textContent = state.tickets;
  } else {
    resultIcon.textContent = '😊';
    resultMessage.textContent = "Let's keep trying!";
    resultMessage.className = 'result-message wrong';
    resultWord.textContent = `The word was "${word}"`;
    ticketEarned.className = 'ticket-earned';
  }

  // Update button text for last word
  if (state.currentIndex >= state.words.length - 1) {
    btnNext.textContent = 'See Results';
  } else {
    btnNext.textContent = 'Next Word';
  }
}

btnCheck.addEventListener('click', checkAnswer);
wordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') checkAnswer();
});

btnNext.addEventListener('click', () => {
  state.currentIndex++;
  if (state.currentIndex >= state.words.length) {
    showSummary();
  } else {
    updateProgress();
    showWord();
  }
});

// ====== SUMMARY LOGIC ======
function showSummary() {
  showScreen(screenSummary);

  const pct = state.correctCount / state.words.length;
  const starCount = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct >= 0.3 ? 1 : 0;

  summaryStars.textContent = '⭐'.repeat(starCount) + '☆'.repeat(3 - starCount);

  if (pct >= 0.9) {
    summaryTitle.textContent = 'Amazing!';
    summarySubtitle.textContent = 'You really know your sight words!';
  } else if (pct >= 0.6) {
    summaryTitle.textContent = 'Great Job!';
    summarySubtitle.textContent = 'Keep practicing and you\'ll be a pro!';
  } else if (pct >= 0.3) {
    summaryTitle.textContent = 'Good Try!';
    summarySubtitle.textContent = 'Practice makes perfect!';
  } else {
    summaryTitle.textContent = 'Keep Going!';
    summarySubtitle.textContent = 'Every word you learn counts!';
  }

  animateNumber(statCorrect, state.correctCount);
  animateNumber(statTotal, state.words.length);
  animateNumber(statTickets, state.tickets);

  const screenMinutes = state.tickets * 2;
  timeDisplay.textContent = `${screenMinutes} minute${screenMinutes !== 1 ? 's' : ''}`;

  if (state.tickets > 0) {
    screenTimeBox.style.display = '';
  } else {
    screenTimeBox.style.display = 'none';
  }

  // Missed words
  if (state.missed.length > 0) {
    missedSection.style.display = '';
    missedList.innerHTML = state.missed.map(w => `<span class="missed-word">${w}</span>`).join('');
  } else {
    missedSection.style.display = 'none';
    launchConfetti();
  }

  // Update progress bar to full
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
  timerTotal = state.tickets * 2 * 60; // seconds
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

      // Flash the timer ring
      timerRingFill.style.stroke = 'var(--color-error)';
    }
  }, 1000);
}

function updateTimerDisplay() {
  const min = Math.floor(timerRemaining / 60);
  const sec = timerRemaining % 60;
  timerMinutes.textContent = String(min).padStart(2, '0');
  timerSeconds.textContent = String(sec).padStart(2, '0');

  // Update ring
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

// ====== DARK MODE TOGGLE ======
// Since this is a kids' quiz app, we default to light mode always
// but still respect parent preference
(function() {
  const html = document.documentElement;
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  html.setAttribute('data-theme', isDark ? 'dark' : 'light');
})();
