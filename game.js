const WIN_GOALS = 10;
const MAX_MISSES = 3;
const game = document.getElementById('game');
const playScene = document.getElementById('playScene');
const resultScene = document.getElementById('resultScene');
const winScene = document.getElementById('winScene');
const kickBtn = document.getElementById('kickBtn');
const kickBtnImg = document.getElementById('kickBtnImg');
const continueBtn = document.getElementById('continueBtn');
const restartBtn = document.getElementById('restartBtn');
const goalsText = document.getElementById('goalsText');
const missesText = document.getElementById('missesText');
const hitsText = document.getElementById('hitsText');
const missBalls = document.querySelectorAll('#missBalls img');
const directionFill = document.getElementById('directionFill');
const powerFill = document.getElementById('powerFill');
const aim = document.getElementById('aim');
const keeper = document.getElementById('keeper');
const ball = document.getElementById('ball');
const hint = document.getElementById('hint');
const resultBase = document.getElementById('resultBase');
const resultDecor = document.getElementById('resultDecor');
const resultText = document.getElementById('resultText');
const kickVideo = document.getElementById('kickVideo');
const kickVideoSource = document.getElementById('kickVideoSource');
const resultVideo = document.getElementById('resultVideo');

const sounds = {
  goal: new Audio('gol.mp3'),
  miss: new Audio('fallo.mp3'),
  start: new Audio('empezar.mp3'),
  kick: new Audio('chutar.mp3')
};
Object.values(sounds).forEach((audio) => { audio.preload = 'auto'; audio.volume = 0.9; });

const state = { goals: 0, misses: 0, phase: 'ready', direction: 0.5, power: 0.5, lastGoal: false, pendingReset: false };
let rafId;
let t0 = performance.now();

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function playSound(audio) {
  audio.pause();
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
function setLoading(on) { game.classList.toggle('game--busy', on); }

function animateMeters(now = performance.now()) {
  const elapsed = (now - t0) / 1000;
  state.direction = (Math.sin(elapsed * 2.25) + 1) / 2;
  state.power = (Math.sin(elapsed * 3.15 - 0.8) + 1) / 2;
  directionFill.style.width = `${state.direction * 100}%`;
  powerFill.style.width = `${state.power * 100}%`;
  aim.style.left = `${18 + state.direction * 64}%`;
  aim.style.top = `${32 + (1 - state.power) * 28}%`;
  rafId = requestAnimationFrame(animateMeters);
}

function updateHud() {
  if (goalsText) goalsText.textContent = state.goals;
  if (missesText) missesText.textContent = state.misses;
  hitsText.textContent = `${state.goals}/${WIN_GOALS}`;
  missBalls.forEach((img, index) => {
    const failed = index < state.misses;
    img.src = failed ? 'balon-marcador-fallo.png' : 'balon-marcador.png';
    img.alt = failed ? `Fallo ${index + 1}` : `Vida ${index + 1}`;
  });
}

function keeperChoice(targetX) {
  const anticipation = Math.random() * 0.24 - 0.12;
  const read = clamp(targetX + anticipation, 0, 1);
  if (read < 0.36) return 'left';
  if (read > 0.64) return 'right';
  return 'center';
}

function resolveShot() {
  const targetX = state.direction;
  const targetY = 1 - state.power;
  const placed = (targetX < 0.28 || targetX > 0.72 || targetY < 0.28) && state.power > 0.36 && state.power < 0.93;
  const wild = state.power < 0.22 || state.power > 0.96 || (targetX < 0.08 || targetX > 0.92) && state.power > 0.82;
  const keeperZone = keeperChoice(targetX);
  const shotZone = targetX < 0.36 ? 'left' : targetX > 0.64 ? 'right' : 'center';
  const keeperArrives = keeperZone === shotZone && !(placed && Math.abs(targetX - 0.5) > 0.34 && state.power > 0.56);
  return !wild && placed && !keeperArrives;
}

function showKickVideo(goal) {
  kickVideoSource.src = goal ? 'gol.webm' : 'tapo.webm';
  kickVideo.load();
  kickVideo.classList.add('show');
  kickVideo.play().catch(() => {});
}

function setBallTarget() {
  const field = document.getElementById('field').getBoundingClientRect();
  ball.style.left = `${18 + state.direction * 64}%`;
  ball.style.bottom = `${field.height * (0.46 + (1 - state.power) * 0.12)}px`;
  ball.classList.add('shooting');
}

function shoot() {
  if (state.phase !== 'ready') return;
  state.phase = 'shooting';
  cancelAnimationFrame(rafId);
  kickBtn.classList.add('is-kicking');
  hint.textContent = '¡Tiro en curso!';
  playSound(sounds.kick);
  const goal = resolveShot();
  state.lastGoal = goal;
  keeper.className = `keeper dive-${state.direction < 0.36 ? 'left' : state.direction > 0.64 ? 'right' : 'center'}`;
  setBallTarget();
  showKickVideo(goal);
  setTimeout(() => setLoading(true), 180);
  setTimeout(() => finishShot(goal), 1250);
}

function finishShot(goal) {
  setLoading(false);
  kickVideo.pause();
  kickVideo.classList.remove('show');
  if (goal) {
    state.goals += 1;
    playSound(sounds.goal);
  } else {
    state.misses += 1;
    playSound(sounds.miss);
  }
  updateHud();
  if (state.goals >= WIN_GOALS) return showWin();
  if (state.misses >= MAX_MISSES) state.pendingReset = true;
  showResult(goal);
}

function showResult(goal) {
  state.phase = 'result';
  playScene.hidden = true;
  resultScene.hidden = false;
  resultBase.src = goal ? 'gol.png' : 'comio.png';
  resultText.textContent = goal ? '¡Gol!' : 'Este penal no fue gol.';
  resultDecor.innerHTML = goal
    ? `<img class="sticker" src="gol-pegatina.png" alt="Gol"><img class="confirm" src="check-gol.png" alt="Confirmado">`
    : `<img class="sticker" src="comio-pegatina.png" alt="Tapada"><img class="uy" src="uy.png" alt="Uy"><img class="confirm" src="x-uy.png" alt="No fue gol">`;
  resultVideo.innerHTML = `<source src="${goal ? 'gol.webm' : 'tapo.webm'}" type="video/webm">`;
  resultVideo.load();
  resultVideo.muted = false;
  resultVideo.play().catch(() => {});
}

function nextRound() {
  setLoading(true);
  setTimeout(() => {
    resultScene.hidden = true;
    playScene.hidden = false;
    if (state.pendingReset) resetMatch(true);
    resetRound();
    setLoading(false);
  }, 500);
}

function resetRound() {
  state.phase = 'ready';
  t0 = performance.now();
  keeper.className = 'keeper';
  ball.className = 'ball';
  ball.removeAttribute('style');
  kickBtn.classList.remove('is-kicking');
  hint.textContent = 'Pulsa patear cuando la mira y potencia estén bien colocadas.';
  animateMeters();
}

function resetMatch(auto = false) {
  state.goals = 0;
  state.misses = 0;
  state.pendingReset = false;
  updateHud();
  if (auto) hint.textContent = 'Tres fallos: la partida se reinicia desde cero.';
}

function showWin() {
  state.phase = 'win';
  playScene.hidden = true;
  resultScene.hidden = true;
  winScene.hidden = false;
}

function restart() {
  winScene.hidden = true;
  playScene.hidden = false;
  resetMatch();
  resetRound();
}

kickBtn.addEventListener('click', shoot);
continueBtn.addEventListener('click', nextRound);
restartBtn.addEventListener('click', restart);
window.addEventListener('load', () => {
  setTimeout(() => game.classList.remove('game--loading'), 700);
  updateHud();
  resetRound();
  document.body.addEventListener('pointerdown', () => playSound(sounds.start), { once: true });
});
