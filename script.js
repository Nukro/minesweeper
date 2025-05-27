const STORAGE_KEY = 'minesweeperState';

const gridElem = document.getElementById('grid');
const mineCountEl = document.getElementById('mine-count');
const timerEl = document.getElementById('timer');
const diffSelect = document.getElementById('difficulty');
const restartBtn = document.getElementById('restart');

let rows, cols, totalMines;
let grid = [];
let timerId = null;
let elapsed = 0;
let firstClick = true;

function saveGameState() {
    const plainGrid = grid.map(row =>
        row.map(cell => ({
            mine: cell.mine,
            neighborMines: cell.neighborMines,
            revealed: cell.revealed,
            flagged: cell.flagged
        }))
    );
    const state = {
        rows, cols, totalMines,
        elapsed, firstClick,
        plainGrid,
        difficulty: diffSelect.value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function rebuildData(state) {
    rows = state.rows;
    cols = state.cols;
    totalMines = state.totalMines;
    diffSelect.value = state.difficulty;

    grid = state.plainGrid.map((row, r) =>
        row.map((pc, c) => ({
            row: r, col: c,
            mine: pc.mine,
            neighborMines: pc.neighborMines,
            revealed: pc.revealed,
            flagged: pc.flagged
        }))
    );
}

function restoreUI(state) {
    elapsed = state.elapsed;
    timerEl.textContent = `Time: ${elapsed}s`;
    firstClick = state.firstClick;

    const flaggedCount = grid.flat().filter(c => c.flagged).length;
    mineCountEl.textContent = `Mines: ${totalMines - flaggedCount}`;
}

function loadGameState() {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!state) return false;

    rebuildData(state);

    renderGrid();
    grid.forEach((row, r) =>
        row.forEach((cell, c) => {
            const div = gridElem.children[r * cols + c];
            if (cell.revealed) {
                div.classList.add('revealed');
                if (cell.mine) {
                    div.classList.add('mine');

                } else if (cell.neighborMines) {
                    div.textContent = cell.neighborMines;
                    div.classList.add(`num${cell.neighborMines}`);
                }
            }
            if (cell.flagged) {
                div.classList.add('flagged');
            }
        })
    );

    restoreUI(state)

    if (!firstClick) starTimer();
    return true;
}

function clearGameState() {
  localStorage.removeItem(STORAGE_KEY);
}


window.addEventListener('load', () => {
  if (localStorage.getItem(STORAGE_KEY)) {
    if (confirm('Resume your last game?')) {
      loadGameState();
      return;
    }
    clearGameState();
  }
  initGame();
});


function initGame() {
    clearInterval(timerId);
    elapsed = 0;
    timerEl.textContent = `Time: 0s`;
    firstClick = true;

    const diff = diffSelect.value;
    if (diff === 'beginner') { 
        rows = 9; 
        cols = 9;  
        totalMines = 10; 

    } else if (diff === 'intermediate') { 
        rows = 16;
        cols = 16; 
        totalMines = 40; 

    } else {
        rows = 16;
        cols = 30; 
        totalMines = 99;
    }

    mineCountEl.textContent = `Mines: ${totalMines}`;
    grid = createEmptyGrid(rows, cols);
    renderGrid();
}

function createEmptyGrid(customRows, customCols) {
    const g = [];
    for (let r = 0; r < customRows; r++) {
        const row = [];
        for (let c = 0; c < customCols; c++) {
            row.push({
                row: r,
                col: c,
                mine: false,
                neighborMines: 0,
                revealed: false,
                flagged: false
            });
        }
        g.push(row);
    }
    return g;
}

function renderGrid() {
    gridElem.innerHTML = '';
    gridElem.style.gridTemplate = `repeat(${rows}, 30px) / repeat(${cols}, 30px)`;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = grid[r][c];
            const div = document.createElement('div');
            div.className = 'cell';
            div.dataset.r = r; 
            div.dataset.c = c;

            div.addEventListener('click', onCellClick);
            div.addEventListener('contextmenu', onCellRightClick);
            gridElem.append(div);
        }
    }
}

function starTimer() {
    timerId = setInterval(() => {
        elapsed++; timerEl.textContent = `Time: ${elapsed}s`;
        saveGameState();
    }, 1000);
}

function onCellClick(e) {
    const r = +e.currentTarget.dataset.r;
    const c = +e.currentTarget.dataset.c;
    const cell = grid[r][c];

    if (cell.flagged || cell.revealed) return;
    if (firstClick) {
        placeMines(r,c);
        starTimer();
        firstClick = false;
    }
    revealCell(r,c);
    saveGameState();
    checkWin();
}

function onCellRightClick(e) {
    e.preventDefault();
    const r = +e.currentTarget.dataset.r;
    const c = +e.currentTarget.dataset.c;
    const cell = grid[r][c];

    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    e.currentTarget.classList.toggle('flagged', cell.flagged);
    const flaggedCount = grid.flat().filter(c => c.flagged).length;
    mineCountEl.textContent = `Mines: ${totalMines - flaggedCount}`;
    saveGameState();
}

function placeMines(avoidR, avoidC) {
    let placed = 0;
    while (placed < totalMines) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        const cell = grid[r][c];

        if (!cell.mine && !(r === avoidR && c === avoidC)) {
            cell.mine = true;
            placed++;
        }
    }
    calculateNeighbors();
}

function calculateNeighbors() {
    const dirs = [-1,0,1];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let count = 0;
            dirs.forEach(dr => dirs.forEach(dc => {
                if (dr || dc) {
                    const nr = r + dr; 
                    const nc = c + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].mine) count++;
                }
            }));
            grid[r][c].neighborMines = count;
        }
    }
}

function revealCell(r,c) {
    const cell = grid[r][c];
    const div = gridElem.children[r * cols + c];

    if (cell.revealed || cell.flagged) return;
    cell.revealed = true;
    div.classList.add('revealed');

    if (cell.mine) {
        div.classList.add('mine');
        gameOver(false);
        return;
    }

    if (cell.neighborMines > 0) {
        div.textContent = cell.neighborMines;
        div.classList.add(`num${cell.neighborMines}`);

    } else {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr
                const nc = c + dc;
                if ((dr || dc) && nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    revealCell(nr, nc);
                }
            }
        }
    }
}

function gameOver(won) {
    clearInterval(timerId);
    grid.flat().forEach(cell => {
        if (cell.mine) {
            const idx = cell.row * cols + cell.col;
            const div = gridElem.children[idx];
            div.classList.add('mine', 'revealed');
        }
    });
    setTimeout(() => {
        alert(won ? 'You win!' : 'Game Over')
        clearGameState();
    }, 50);
}


function checkWin() {
    const unrevealed = grid.flat().filter(c => !c.revealed).length;
    if (unrevealed === totalMines) {
        gameOver(true);
    }
}


restartBtn.addEventListener('click', () => {
    clearGameState();
    initGame();
});
diffSelect.addEventListener('change', initGame);

initGame();