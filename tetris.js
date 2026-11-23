function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let isPaused = false;
let isClearing = false;
let clearingRows = [];
let clearStart = 0;
const CLEAR_DURATION = 380;

// State Pengaturan UX
let isDownHardDrop = false;
let isSwipeEnabled = true;

function generateSequence() {
  const sequence = ["I", "J", "L", "O", "S", "T", "Z"];
  while (sequence.length) {
    const rand = getRandomInt(0, sequence.length - 1);
    tetrominoSequence.push(sequence.splice(rand, 1)[0]);
  }
}

function getNextTetromino() {
  if (!tetrominoSequence.length) generateSequence();
  const name = tetrominoSequence.pop();
  const matrix = tetrominos[name];
  const col = playfield[0].length / 2 - Math.ceil(matrix[0].length / 2);
  const row = name === "I" ? -1 : -2;
  return { name, matrix, row, col };
}

function rotate(matrix) {
  const N = matrix.length - 1;
  return matrix.map((row, i) => row.map((_, j) => matrix[N - j][i]));
}

function isValidMove(matrix, cellRow, cellCol) {
  for (let r = 0; r < matrix.length; r++)
    for (let c = 0; c < matrix[r].length; c++)
      if (
        matrix[r][c] &&
        (cellCol + c < 0 ||
          cellCol + c >= playfield[0].length ||
          cellRow + r >= playfield.length ||
          playfield[cellRow + r][cellCol + c])
      )
        return false;
  return true;
}

function placeTetromino() {
  for (let r = 0; r < tetromino.matrix.length; r++) {
    for (let c = 0; c < tetromino.matrix[r].length; c++) {
      if (tetromino.matrix[r][c]) {
        if (tetromino.row + r < 0) return showGameOver();
        playfield[tetromino.row + r][tetromino.col + c] = tetromino.name;
      }
    }
  }

  const fullRows = [];
  for (let r = 0; r < 20; r++) {
    if (playfield[r].every((cell) => !!cell)) fullRows.push(r);
  }

  if (fullRows.length) {
    isClearing = true;
    clearingRows = fullRows;
    clearStart = performance.now();
    tetromino = null;
  } else {
    tetromino = getNextTetromino();
  }
}

function finishClearingRows() {
  const clearSet = new Set(clearingRows);
  const keep = [];
  for (let r = 0; r < 20; r++) if (!clearSet.has(r)) keep.push(playfield[r]);
  const freshRows = clearingRows.map(() => new Array(playfield[0].length).fill(0));
  const combined = freshRows.concat(keep);
  for (let r = 0; r < 20; r++) playfield[r] = combined[r];

  score += clearingRows.length;
  updateScore();

  clearingRows = [];
  isClearing = false;
  tetromino = getNextTetromino();
}

function showGameOver() {
  cancelAnimationFrame(rAF);
  gameOver = true;
  context.fillStyle = "black";
  context.globalAlpha = 0.75;
  context.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);
  context.globalAlpha = 1;
  context.fillStyle = "white";
  context.font = "36px monospace";
  context.textAlign = "center";
  context.fillText("GAME OVER!", canvas.width / 2, canvas.height / 2 + 12);
}

const canvas = document.getElementById("game");
const context = canvas.getContext("2d");
const scoreboard = document.getElementById("scoreboard");
const pauseOverlay = document.getElementById("pauseOverlay");
const btnPause = document.getElementById("btnPause");

const grid = 32;
const tetrominoSequence = [];
const playfield = [];
for (let row = -2; row < 20; row++) {
  playfield[row] = [];
  for (let col = 0; col < 10; col++) playfield[row][col] = 0;
}

const tetrominos = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
  O: [[1,1],[1,1]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
};

const colors = {
  I: "cyan", O: "yellow", T: "purple", S: "green", Z: "red", J: "blue", L: "orange",
};

let count = 0,
  tetromino = getNextTetromino(),
  rAF = null,
  gameOver = false,
  score = 0;

function updateScore() {
  scoreboard.textContent = "Score: " + score;
}

function loop() {
  rAF = requestAnimationFrame(loop);
  if (isPaused) return;
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < 20; r++) {
    for (let c = 0; c < 10; c++) {
      if (playfield[r][c]) {
        context.fillStyle = colors[playfield[r][c]];
        context.fillRect(c * grid, r * grid, grid - 1, grid - 1);
      }
    }
  }

  if (isClearing) {
    const elapsed = performance.now() - clearStart;
    const alpha = 0.35 + Math.abs(Math.sin((elapsed / 1000) * 10 * Math.PI * 2)) * 0.45;
    context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    for (const r of clearingRows) {
      context.fillRect(0, r * grid, canvas.width, grid - 1);
    }
    if (elapsed >= CLEAR_DURATION) finishClearingRows();
    return;
  }

  if (tetromino) {
    if (++count > 35) {
      tetromino.row++;
      count = 0;
      if (!isValidMove(tetromino.matrix, tetromino.row, tetromino.col)) {
        tetromino.row--;
        placeTetromino();
      }
    }

    if (tetromino) {
      let ghostRow = tetromino.row;
      while (isValidMove(tetromino.matrix, ghostRow + 1, tetromino.col)) {
        ghostRow++;
      }
      context.strokeStyle = colors[tetromino.name];
    //   context.globalAlpha = 0.35;
      for (let r = 0; r < tetromino.matrix.length; r++) {
        for (let c = 0; c < tetromino.matrix[r].length; c++) {
          if (tetromino.matrix[r][c]) {
            context.strokeRect(
              (tetromino.col + c) * grid + 1,
              (ghostRow + r) * grid + 1,
              grid - 3,
              grid - 3
            );
          }
        }
      }
      context.globalAlpha = 1;
    }

    context.fillStyle = colors[tetromino.name];
    for (let r = 0; r < tetromino.matrix.length; r++) {
      for (let c = 0; c < tetromino.matrix[r].length; c++) {
        if (tetromino.matrix[r][c]) {
          context.fillRect(
            (tetromino.col + c) * grid,
            (tetromino.row + r) * grid,
            grid - 1,
            grid - 1
          );
        }
      }
    }
  }
}

function moveLeft() {
  if (gameOver || isPaused || !tetromino) return;
  if (isValidMove(tetromino.matrix, tetromino.row, tetromino.col - 1)) tetromino.col--;
}

function moveRight() {
  if (gameOver || isPaused || !tetromino) return;
  if (isValidMove(tetromino.matrix, tetromino.row, tetromino.col + 1)) tetromino.col++;
}

function rotatePiece() {
  if (gameOver || isPaused || !tetromino) return;
  const matrix = rotate(tetromino.matrix);
  if (isValidMove(matrix, tetromino.row, tetromino.col)) tetromino.matrix = matrix;
}

function moveDown() {
  if (gameOver || isPaused || !tetromino) return;
  
  if (isDownHardDrop) {
    hardDrop();
    return;
  }

  const row = tetromino.row + 1;
  if (!isValidMove(tetromino.matrix, row, tetromino.col)) {
    tetromino.row = row - 1;
    placeTetromino();
    return;
  }
  tetromino.row = row;
}

function hardDrop() {
  if (gameOver || isPaused || !tetromino) return;
  while (isValidMove(tetromino.matrix, tetromino.row + 1, tetromino.col)) {
    tetromino.row++;
  }
  placeTetromino();
}

function togglePause() {
  if (gameOver) return;
  isPaused = !isPaused;
  if (isPaused) {
    cancelAnimationFrame(rAF);
    pauseOverlay.classList.remove("d-none");
    btnPause.textContent = "▶";
  } else {
    pauseOverlay.classList.add("d-none");
    btnPause.textContent = "||";
    rAF = requestAnimationFrame(loop);
  }
}

// KONTROL KEYBOARD (DESKTOP)
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    togglePause();
    return;
  }
  if (gameOver || isPaused) return;
  if (e.key === "ArrowLeft") moveLeft();
  else if (e.key === "ArrowRight") moveRight();
  else if (e.key === "ArrowUp") rotatePiece();
  else if (e.key === "ArrowDown") moveDown();
  else if (e.key === "Shift" || e.key === "Enter") {
    e.preventDefault();
    hardDrop();
  }
});

// KONTROL GAMEPAD MOBILE (POINTER + HOLD)
function bindButton(elementId, actionFn, allowHold = false) {
  const btn = document.getElementById(elementId);
  let holdTimeout = null;
  let holdInterval = null;

  const stopHold = () => {
    clearTimeout(holdTimeout);
    clearInterval(holdInterval);
    btn.classList.remove("is-pressed");
  };

  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);
    btn.classList.add("is-pressed");
    actionFn();

    if (allowHold) {
      holdTimeout = setTimeout(() => {
        holdInterval = setInterval(actionFn, 75);
      }, 220); // Delay awal 220ms sebelum repeat cepat
    }
  });

  btn.addEventListener("pointerup", stopHold);
  btn.addEventListener("pointercancel", stopHold);
}

bindButton("btnLeft", moveLeft, true);
bindButton("btnRight", moveRight, true);
bindButton("btnRotate", rotatePiece, false);
bindButton("btnHardDrop", hardDrop, false);

// Tombol Bawah dinamis (Soft Drop atau Hard Drop sesuai toggle)
bindButton(
  "btnDown",
  () => {
    if (isDownHardDrop) hardDrop();
    else moveDown();
  },
  true
);

// TOUCH GESTURE DI CANVAS
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let lastMoveX = 0;
let lastMoveY = 0;
let hasMoved = false;

canvas.addEventListener("pointerdown", (e) => {
  if (!isSwipeEnabled || gameOver || isPaused) return;
  touchStartX = lastMoveX = e.clientX;
  touchStartY = lastMoveY = e.clientY;
  touchStartTime = performance.now();
  hasMoved = false;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", (e) => {
  if (!isSwipeEnabled || gameOver || isPaused || !touchStartTime) return;
  const dx = e.clientX - lastMoveX;
  const dy = e.clientY - lastMoveY;
  const stepThreshold = 24; // Sensitivitas geser per kolom/baris

  if (Math.abs(dx) > stepThreshold) {
    if (dx > 0) moveRight();
    else moveLeft();
    lastMoveX = e.clientX;
    hasMoved = true;
  }

  if (dy > stepThreshold) {
    moveDown();
    lastMoveY = e.clientY;
    hasMoved = true;
  }
});

canvas.addEventListener("pointerup", (e) => {
  if (!isSwipeEnabled || gameOver || isPaused || !touchStartTime) return;
  const totalDx = e.clientX - touchStartX;
  const totalDy = e.clientY - touchStartY;
  const elapsed = performance.now() - touchStartTime;

  // Flick cepat ke bawah -> Hard Drop
  if (totalDy > 50 && elapsed < 220 && Math.abs(totalDy) > Math.abs(totalDx)) {
    hardDrop();
  } 
  // Tap singkat tanpa geser -> Rotate
  else if (!hasMoved && Math.abs(totalDx) < 10 && Math.abs(totalDy) < 10 && elapsed < 250) {
    rotatePiece();
  }

  touchStartTime = 0;
});

// BOOTSTRAP MODAL & SETTINGS SWITCHES
const helpModalEl = document.getElementById("helpModal");
helpModalEl.addEventListener("show.bs.modal", () => {
  if (!isPaused && !gameOver) togglePause();
});

// 1. Fungsi sinkronisasi tampilan UI saat mode berubah
const toggleDownHardDrop = document.getElementById("toggleDownHardDrop");
const dropModeBadge = document.getElementById("dropModeBadge");
const btnDown = document.getElementById("btnDown");
const btnHardDrop = document.getElementById("btnHardDrop");
const iconSoftDrop = document.getElementById("iconSoftDrop");
const iconHardDropAlt = document.getElementById("iconHardDropAlt");

function setDropMode(hardDropActive) {
  isDownHardDrop = hardDropActive;
  toggleDownHardDrop.checked = hardDropActive;

  if (isDownHardDrop) {
    // Update Badge Header
    dropModeBadge.textContent = "⤓ HARD";
    dropModeBadge.className = "badge bg-info text-dark";
    
    // Update Tombol Mobile (Ubah warna jadi biru & sembunyikan tombol terpisah)
    btnDown.classList.replace("btn-outline-light", "btn-info");
    btnHardDrop.classList.add("d-none");
    iconSoftDrop.classList.add("d-none");
    iconHardDropAlt.classList.remove("d-none");
  } else {
    // Update Badge Header
    dropModeBadge.textContent = "↓ SOFT";
    dropModeBadge.className = "badge bg-secondary text-light";

    // Update Tombol Mobile
    btnDown.classList.replace("btn-info", "btn-outline-light");
    btnHardDrop.classList.remove("d-none");
    iconSoftDrop.classList.remove("d-none");
    iconHardDropAlt.classList.add("d-none");
  }
}

// Event dari switch di Modal maupun klik langsung di Badge Header
toggleDownHardDrop.addEventListener("change", (e) => setDropMode(e.target.checked));
dropModeBadge.addEventListener("click", () => setDropMode(!isDownHardDrop));

document.getElementById("toggleSwipeGesture").addEventListener("change", (e) => {
  isSwipeEnabled = e.target.checked;
});

rAF = requestAnimationFrame(loop);