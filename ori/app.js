    function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    let isPaused = false;
    let isClearing = false;
    let clearingRows = [];
    let clearStart = 0;
    const CLEAR_DURATION = 380

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
      return {name, matrix, row, col};
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
      // let linesCleared = 0;
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
      context.fillText("GAME OVER!", canvas.width / 2, canvas.height / 2);
    }

    const canvas = document.getElementById("game");
    const context = canvas.getContext("2d");
    const scoreboard = document.getElementById("scoreboard");
    const grid = 32;
    const tetrominoSequence = [];
    const playfield = [];
    for (let row = -2; row < 20; row++) {
      playfield[row] = [];
      for (let col = 0; col < 10; col++) playfield[row][col] = 0;
    }
    const tetrominos = {
      I: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      J: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
      L: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
      ],
      O: [
        [1, 1],
        [1, 1],
      ],
      S: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
      ],
      Z: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
      ],
      T: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
    };
    const colors = {
      I: "cyan",
      O: "yellow",
      T: "purple",
      S: "green",
      Z: "red",
      J: "blue",
      L: "orange",
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
      for (let r = 0; r < 20; r++)
        for (let c = 0; c < 10; c++)
          if (playfield[r][c]) {
            const name = playfield[r][c];
            context.fillStyle = colors[name];
            context.fillRect(c * grid, r * grid, grid - 1, grid - 1);
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
        context.fillStyle = colors[tetromino.name];
        for (let r = 0; r < tetromino.matrix.length; r++)
          for (let c = 0; c < tetromino.matrix[r].length; c++)
            if (tetromino.matrix[r][c])
              context.fillRect(
                (tetromino.col + c) * grid,
                (tetromino.row + r) * grid,
                grid - 1,
                grid - 1,
              );
      }
    }

    function moveLeft() {
      if (gameOver || isPaused) return;
      if (isValidMove(tetromino.matrix, tetromino.row, tetromino.col - 1))
        tetromino.col--;
    }

    function moveRight() {
      if (gameOver || isPaused) return;
      if (isValidMove(tetromino.matrix, tetromino.row, tetromino.col + 1))
        tetromino.col++;
    }
    function rotatePiece() {
      if (gameOver || isPaused) return;
      const matrix = rotate(tetromino.matrix);
      if (isValidMove(matrix, tetromino.row, tetromino.col))
        tetromino.matrix = matrix;
    }
    function moveDown() {
      if (gameOver || isPaused) return;
      const row = tetromino.row + 1;
      if (!isValidMove(tetromino.matrix, row, tetromino.col)) {
        tetromino.row = row - 1;
        placeTetromino();
        return;
      }
      tetromino.row = row;
    }
    
    function hardDrop() {
      if (gameOver || isPaused) return;
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
        context.fillStyle = "rgba(0,0,0,0.5)";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "white";
        context.font = "36px monospace";
        context.textAlign = "center";
        context.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
      } else {
        rAF = requestAnimationFrame(loop);
      }
    }

    document.addEventListener("keydown", (e) => {
      if (e.which === 32) {
        togglePause();
        return;
      }
      if (gameOver || isPaused) return;
      if (e.which === 37) moveLeft();
      if (e.which === 39) moveRight();
      if (e.which === 38) rotatePiece();
      if (e.which === 40) moveDown();
    });

    rAF = requestAnimationFrame(loop);