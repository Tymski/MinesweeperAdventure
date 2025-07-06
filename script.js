document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('minesweeper-canvas');
    const ctx = canvas.getContext('2d');
    const restartBtn = document.getElementById('restart-btn');
    const easyBtn = document.getElementById('easy-btn');
    const mediumBtn = document.getElementById('medium-btn');
    const hardBtn = document.getElementById('hard-btn');
    const winsCounter = document.getElementById('wins-counter');
    const lossesCounter = document.getElementById('losses-counter');
    const bombsCounter = document.getElementById('bombs-counter');

    let COLS = 11;
    let ROWS = 11;
    const EXTRA_ROWS = 2; // Start and finish areas
    let TOTAL_ROWS = ROWS + EXTRA_ROWS;
    let MINE_DENSITY = 0.16; // Medium default
    let NUM_MINES = Math.floor(COLS * ROWS * MINE_DENSITY);
    const CELL_SIZE = 32;

    let board = [];
    let gameOver = false;
    let firstMove = true;
    let player = { r: TOTAL_ROWS - 1, c: Math.floor(COLS / 2) };
    let animationInterval = null;
    let mineSize = 1;
    let wins = 0;
    let losses = 0;
    let gameOutcome = null; // null, 'win', or 'loss'

    function updateCounters(isWin) {
        if (isWin) {
            winsCounter.parentElement.classList.add('score-animation');
        } else {
            lossesCounter.parentElement.classList.add('score-animation');
        }
        setTimeout(() => {
            winsCounter.parentElement.classList.remove('score-animation');
            lossesCounter.parentElement.classList.remove('score-animation');
        }, 1000);
        winsCounter.textContent = wins;
        lossesCounter.textContent = losses;
    }

    function updateBombsCounter() {
        const flaggedCells = board.flat().filter(cell => cell.isFlagged).length;
        bombsCounter.textContent = NUM_MINES - flaggedCells;
    }


    function resizeCanvas() {
        TOTAL_ROWS = ROWS + EXTRA_ROWS;
        canvas.width = COLS * CELL_SIZE;
        canvas.height = TOTAL_ROWS * CELL_SIZE;
    }

    function createBoard() {
        if (gameOutcome === 'win') {
            ROWS++;
            COLS++;
        } else if (gameOutcome === 'loss') {
            ROWS = Math.max(5, ROWS - 1);
            COLS = Math.max(5, COLS - 1);
        }
        gameOutcome = null;

        NUM_MINES = Math.floor(COLS * ROWS * MINE_DENSITY);
        resizeCanvas();
        board = Array.from({ length: TOTAL_ROWS }, (row, r) =>
            Array.from({ length: COLS }, (col, c) => ({
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                adjacentMines: 0,
                isStart: r === TOTAL_ROWS - 1,
                isFinish: r === 0,
            }))
        );
    }

    function generateMines(initialR, initialC) {
        let minesPlaced = 0;
        while (minesPlaced < NUM_MINES) {
            const r = Math.floor(Math.random() * ROWS) + 1;
            const c = Math.floor(Math.random() * COLS);
            if (!board[r][c].isMine && !(r === initialR && c === initialC)) {
                board[r][c].isMine = true;
                minesPlaced++;
            }
        }

        // Calculate adjacent mines
        for (let r = 1; r < TOTAL_ROWS - 1; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c].isMine) continue;
                let count = 0;
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        const newRow = r + i;
                        const newCol = c + j;
                        if (
                            newRow > 0 && newRow < TOTAL_ROWS - 1 &&
                            newCol >= 0 && newCol < COLS &&
                            board[newRow][newCol].isMine
                        ) {
                            count++;
                        }
                    }
                }
                board[r][c].adjacentMines = count;
            }
        }
    }

    function getNumberColor(num) {
        switch (num) {
            case 1: return '#0000ff'; // Blue
            case 2: return '#008000'; // Green
            case 3: return '#ff0000'; // Red
            case 4: return '#00008b'; // Dark blue
            case 5: return '#8b0000'; // Dark red
            case 6: return '#008b8b'; // Dark cyan
            case 7: return '#000000'; // Black
            case 8: return '#808080'; // Grey
            default: return '#000000';
        }
    }

    function drawCharacterInCell(char, r, c, color) {
        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE;
        ctx.fillStyle = color;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, x + CELL_SIZE / 2, y + CELL_SIZE / 2);
    }

    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let r = 0; r < TOTAL_ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = board[r][c];
                const x = c * CELL_SIZE;
                const y = r * CELL_SIZE;

                if (cell.isStart) {
                    ctx.fillStyle = '#a0a0a0';
                } else if (cell.isFinish) {
                    ctx.fillStyle = '#9dab9d';
                }
                else {
                    ctx.fillStyle = cell.isRevealed ? '#e0e0e0' : '#c0c0c0';
                }
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

                if (cell.isStart) {
                    drawCharacterInCell('^', r, c, 'gray');
                }

                if (!cell.isRevealed && !cell.isStart && !cell.isFinish) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                    ctx.fillRect(x + 3, y + 3, CELL_SIZE - 6, CELL_SIZE - 6);
                }

                ctx.strokeStyle = '#808080';
                ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
                if (gameOutcome === 'win' && cell.isMine) {
                    ctx.fillStyle = 'green';
                    ctx.beginPath();
                    ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE / 4, 0, 2 * Math.PI);
                    ctx.fill();
                }
                if (cell.isRevealed) {
                    if (cell.isMine) {
                        ctx.fillStyle = 'red';
                        ctx.beginPath();
                        ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, (CELL_SIZE / 3) * mineSize, 0, 2 * Math.PI);
                        ctx.fill();
                    } else if (cell.adjacentMines > 0) {
                        drawCharacterInCell(cell.adjacentMines, r, c, getNumberColor(cell.adjacentMines));
                    }
                } else if (cell.isFlagged) {
                    drawCharacterInCell('P', r, c, 'red');
                }
            }
        }

        // Draw Player
        const playerX = player.c * CELL_SIZE;
        const playerY = player.r * CELL_SIZE;
        ctx.fillStyle = 'green';
        ctx.fillRect(playerX, playerY, CELL_SIZE, CELL_SIZE);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeRect(playerX, playerY, CELL_SIZE, CELL_SIZE);
        ctx.lineWidth = 1;

        const currentPlayerCell = board[player.r][player.c];
        if (currentPlayerCell.isRevealed) {
            if (currentPlayerCell.isMine) {
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(playerX + CELL_SIZE / 2, playerY + CELL_SIZE / 2, (CELL_SIZE / 3) * mineSize, 0, 2 * Math.PI);
                ctx.fill();
            } else if (currentPlayerCell.adjacentMines > 0) {
                drawCharacterInCell(currentPlayerCell.adjacentMines, player.r, player.c, 'white');
            }
        }
    }

    function revealCell(r, c) {
        if (r < 1 || r >= TOTAL_ROWS - 1 || c < 0 || c >= COLS || board[r][c].isRevealed) {
            return;
        }

        const cell = board[r][c];

        if (cell.isFlagged) {
            cell.isFlagged = false;
            updateBombsCounter();
        }

        cell.isRevealed = true;

        if (cell.isMine) {
            losses++;
            gameOutcome = 'loss';
            updateCounters(false);
            startGameOverAnimation();
        } else if (cell.adjacentMines === 0) {
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (i === 0 && j === 0) continue;
                    revealCell(r + i, c + j);
                }
            }
        }
        drawBoard();
    }

    function startGameOverAnimation() {
        gameOver = true;
        canvas.classList.add('lose-glow');
        let growing = true;
        animationInterval = setInterval(() => {
            if (growing) {
                mineSize += 0.1;
                if (mineSize >= 1.5) {
                    growing = false;
                }
            } else {
                mineSize -= 0.1;
                if (mineSize <= 0.5) {
                    growing = true;
                }
            }
            board.forEach((row, r) => {
                row.forEach((cell, c) => {
                    if (cell.isMine) {
                        cell.isRevealed = true;
                    }
                });
            });
            drawBoard();
        }, 50);
        document.addEventListener('keydown', restartGameOnAnyKey, { once: true });
    }

    function checkWinCondition() {
        if (player.r === 0) {
            wins++;
            gameOutcome = 'win';
            updateCounters(true);
            gameOver = true;
            canvas.classList.add('win-glow');
            if (animationInterval) clearInterval(animationInterval);
            drawBoard(); // Draw the final state before waiting for input
            document.addEventListener('keydown', restartGameOnAnyKey, { once: true });
        }
    }

    function handleInput(direction) {
        if (gameOver) {
            restartGame();
            return;
        }

        let newR = player.r;
        let newC = player.c;

        switch (direction) {
            case 'up': newR--; break;
            case 'down': newR++; break;
            case 'left': newC--; break;
            case 'right': newC++; break;
            default: return;
        }

        if (newR >= 0 && newR < TOTAL_ROWS && newC >= 0 && newC < COLS) {
            if (board[newR][newC].isFlagged) {
                return; // Don't move onto a flagged cell
            }

            if (firstMove && newR > 0 && newR < TOTAL_ROWS - 1) {
                firstMove = false;
                generateMines(newR, newC);
            }

            player.r = newR;
            player.c = newC;

            if (!board[player.r][player.c].isStart && !board[player.r][player.c].isFinish) {
                revealCell(player.r, player.c);
            }

            checkWinCondition();
            drawBoard();
        }
    }

    function handleKeyDown(event) {
        switch (event.key) {
            case 'ArrowUp': handleInput('up'); break;
            case 'ArrowDown': handleInput('down'); break;
            case 'ArrowLeft': handleInput('left'); break;
            case 'ArrowRight': handleInput('right'); break;
            case 'q': toggleFlag(player.r - 1, player.c - 1); return;
            case 'w': toggleFlag(player.r - 1, player.c); return;
            case 'e': toggleFlag(player.r - 1, player.c + 1); return;
            case 'a': toggleFlag(player.r, player.c - 1); return;
            case 'd': toggleFlag(player.r, player.c + 1); return;
            case 'z': toggleFlag(player.r + 1, player.c - 1); return;
            case 'x': toggleFlag(player.r + 1, player.c); return;
            case 'c': toggleFlag(player.r + 1, player.c + 1); return;
            case 'r': restartGame(); return;
            default: return;
        }
    }

    function toggleFlag(r, c) {
        if (r < 1 || r >= TOTAL_ROWS - 1 || c < 0 || c >= COLS || board[r][c].isRevealed) {
            return;
        }
        board[r][c].isFlagged = !board[r][c].isFlagged;
        updateBombsCounter();
        drawBoard();
    }

    function restartGameOnAnyKey(event) {
        if (event.key) {
            restartGame();
        }
    }

    function restartGame() {
        document.removeEventListener('keydown', restartGameOnAnyKey);
        restartBtn.blur();
        canvas.classList.remove('win-glow', 'lose-glow');
        gameOver = false;
        firstMove = true;
        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
        mineSize = 1;
        createBoard();
        updateBombsCounter();
        player = { r: TOTAL_ROWS - 1, c: Math.floor(COLS / 2) };
        drawBoard();
    }

    function setActiveDifficultyButton(activeButton) {
        easyBtn.classList.remove('active-difficulty');
        mediumBtn.classList.remove('active-difficulty');
        hardBtn.classList.remove('active-difficulty');
        activeButton.classList.add('active-difficulty');
    }

    easyBtn.addEventListener('click', (e) => {
        MINE_DENSITY = 0.13;
        ROWS = 9;
        COLS = 9;
        restartGame();
        e.currentTarget.blur();
        setActiveDifficultyButton(easyBtn);
    });

    mediumBtn.addEventListener('click', (e) => {
        MINE_DENSITY = 0.16;
        ROWS = 11;
        COLS = 11;
        restartGame();
        e.currentTarget.blur();
        setActiveDifficultyButton(mediumBtn);
    });

    hardBtn.addEventListener('click', (e) => {
        MINE_DENSITY = 0.21;
        ROWS = 13;
        COLS = 13;
        restartGame();
        e.currentTarget.blur();
        setActiveDifficultyButton(hardBtn);
    });

    document.addEventListener('keydown', handleKeyDown);
    restartBtn.addEventListener('click', restartGame);

    const upBtn = document.getElementById('up-btn');
    const downBtn = document.getElementById('down-btn');
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    const flagBtn = document.getElementById('flag-btn');
    const flagGrid = document.getElementById('flag-grid');
    const arrowControls = document.querySelector('.arrow-controls');

    upBtn.addEventListener('click', (e) => { e.currentTarget.blur(); e.preventDefault(); handleInput('up'); });
    downBtn.addEventListener('click', (e) => { e.currentTarget.blur(); e.preventDefault(); handleInput('down'); });
    leftBtn.addEventListener('click', (e) => { e.currentTarget.blur(); e.preventDefault(); handleInput('left'); });
    rightBtn.addEventListener('click', (e) => { e.currentTarget.blur(); e.preventDefault(); handleInput('right'); });

    flagBtn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        e.preventDefault();
        arrowControls.classList.toggle('hidden');
        flagGrid.classList.toggle('hidden');
        flagBtn.classList.toggle('hidden');
    });

    flagGrid.addEventListener('click', (e) => {
        const button = e.target.closest('.flag-grid-btn');
        if (button) {
            e.currentTarget.blur();
            e.preventDefault();
            const r = parseInt(button.dataset.r);
            const c = parseInt(button.dataset.c);

            if (r === 0 && c === 0) {
                // Cancel button
            } else {
                toggleFlag(player.r + r, player.c + c);
            }

            arrowControls.classList.remove('hidden');
            flagGrid.classList.add('hidden');
            flagBtn.classList.remove('hidden');
        }
    });

    let touchStartX = 0;
    let touchStartY = 0;
    const SWIPE_THRESHOLD = 30; // Minimum distance for a swipe

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;

        if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_THRESHOLD) {
            if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal swipe
                if (dx > 0) {
                    handleInput('right');
                } else {
                    handleInput('left');
                }
            } else {
                // Vertical swipe
                if (dy > 0) {
                    handleInput('down');
                } else {
                    handleInput('up');
                }
            }
        }
    }, { passive: false });

    updateCounters();
    setActiveDifficultyButton(mediumBtn); // Set initial active difficulty
    restartGame();
});