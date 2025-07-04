document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('minesweeper-canvas');
    const ctx = canvas.getContext('2d');
    const restartBtn = document.getElementById('restart-btn');
    const modal = document.getElementById('modal');
    const modalMessage = document.getElementById('modal-message');
    const modalRestartBtn = document.getElementById('modal-restart-btn');
    const easyBtn = document.getElementById('easy-btn');
    const mediumBtn = document.getElementById('medium-btn');
    const hardBtn = document.getElementById('hard-btn');
    const winsCounter = document.getElementById('wins-counter');
    const lossesCounter = document.getElementById('losses-counter');

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

    function updateCounters() {
        winsCounter.textContent = wins;
        lossesCounter.textContent = losses;
    }

    function resizeCanvas() {
        TOTAL_ROWS = ROWS + EXTRA_ROWS;
        canvas.width = COLS * CELL_SIZE;
        canvas.height = TOTAL_ROWS * CELL_SIZE;
        const infoPanel = document.querySelector('.info-panel');
        infoPanel.style.width = `${canvas.width}px`;
    }

    function createBoard() {
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
        NUM_MINES = Math.floor(COLS * ROWS * MINE_DENSITY);
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

    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let r = 0; r < TOTAL_ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = board[r][c];
                const x = c * CELL_SIZE;
                const y = r * CELL_SIZE;

                if (cell.isStart || cell.isFinish) {
                    ctx.fillStyle = '#a0a0a0';
                } else {
                    ctx.fillStyle = cell.isRevealed ? '#e0e0e0' : '#c0c0c0';
                }
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                ctx.strokeStyle = '#808080';
                ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

                if (cell.isRevealed) {
                    if (cell.isMine) {
                        ctx.fillStyle = 'red';
                        ctx.beginPath();
                        ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, (CELL_SIZE / 3) * mineSize, 0, 2 * Math.PI);
                        ctx.fill();
                    } else if (cell.adjacentMines > 0) {
                        ctx.fillStyle = 'black';
                        ctx.font = '20px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(cell.adjacentMines, x + CELL_SIZE / 2, y + CELL_SIZE / 2);
                    }
                } else if (cell.isFlagged) {
                    ctx.fillStyle = 'blue';
                    ctx.font = '20px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('P', x + CELL_SIZE / 2, y + CELL_SIZE / 2);
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
                ctx.fillStyle = 'white';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(currentPlayerCell.adjacentMines, playerX + CELL_SIZE / 2, playerY + CELL_SIZE / 2);
            }
        }
    }

    function revealCell(r, c) {
        if (r < 1 || r >= TOTAL_ROWS - 1 || c < 0 || c >= COLS || board[r][c].isRevealed) {
            return;
        }

        const cell = board[r][c];
        cell.isRevealed = true;

        if (cell.isMine) {
            losses++;
            ROWS = Math.max(5, ROWS - 1);
            COLS = Math.max(5, COLS - 1);
            updateCounters();
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
        showModal('Game Over!');
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
    }

    function checkWinCondition() {
        if (player.r === 0) {
            wins++;
            ROWS++;
            COLS++;
            updateCounters();
            gameOver = true;
            showModal('You Win!');
            if (animationInterval) clearInterval(animationInterval);
        }
    }

    function handleKeyDown(event) {
        if (gameOver) return;

        let newR = player.r;
        let newC = player.c;

        switch (event.key) {
            case 'ArrowUp': newR--; break;
            case 'ArrowDown': newR++; break;
            case 'ArrowLeft': newC--; break;
            case 'ArrowRight': newC++; break;
            case 'q': toggleFlag(player.r - 1, player.c - 1); return;
            case 'w': toggleFlag(player.r - 1, player.c); return;
            case 'e': toggleFlag(player.r - 1, player.c + 1); return;
            case 'a': toggleFlag(player.r, player.c - 1); return;
            case 'd': toggleFlag(player.r, player.c + 1); return;
            case 'z': toggleFlag(player.r + 1, player.c - 1); return;
            case 'x': toggleFlag(player.r + 1, player.c); return;
            case 'c': toggleFlag(player.r + 1, player.c + 1); return;
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

    function toggleFlag(r, c) {
        if (r < 1 || r >= TOTAL_ROWS - 1 || c < 0 || c >= COLS || board[r][c].isRevealed) {
            return;
        }
        board[r][c].isFlagged = !board[r][c].isFlagged;
        drawBoard();
    }

    function showModal(message) {
        modalMessage.textContent = message;
        modal.style.display = 'block';
        modalRestartBtn.focus();
    }

    function hideModal() {
        modal.style.display = 'none';
    }

    function restartGame() {
        gameOver = false;
        firstMove = true;
        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
        mineSize = 1;
        createBoard();
        player = { r: TOTAL_ROWS - 1, c: Math.floor(COLS / 2) };
        drawBoard();
        hideModal();
    }

    easyBtn.addEventListener('click', () => {
        MINE_DENSITY = 0.13;
        restartGame();
    });

    mediumBtn.addEventListener('click', () => {
        MINE_DENSITY = 0.16;
        restartGame();
    });

    hardBtn.addEventListener('click', () => {
        MINE_DENSITY = 0.21;
        restartGame();
    });

    document.addEventListener('keydown', handleKeyDown);
    restartBtn.addEventListener('click', restartGame);
    modalRestartBtn.addEventListener('click', restartGame);

    updateCounters();
    restartGame();
});
