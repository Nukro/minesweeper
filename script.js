const STORAGE_KEY = 'minesweeperState';

const gridElem = document.getElementById('grid');
const mineCountEl = document.getElementById('mine-count');
const timerEl = document.getElementById('timer');
const diffSelect = document.getElementById('difficulty');
const restartBtn = document.getElementById('restart');

const audio = {
  click: new Audio('sounds/click.mp3'),
  flag:  new Audio('sounds/flag.mp3'),
  boom:  new Audio('sounds/explosion.mp3'),
  win:   new Audio('sounds/win.mp3'),
  bgm:   new Audio('sounds/bgm.mp3')
};

audio.bgm.loop = true;

let rows, cols, totalMines;
let grid = [];
let timerId = null;
let elapsed = 0;
let firstClick = true;
let selectedRow = 0;
let selectedCol = 0;

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
    highlightSelectedCell();
    return true;
}

function clearGameState() {
  localStorage.removeItem(STORAGE_KEY);
}


function highlightSelectedCell() {
    gridElem.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    const idx = selectedRow * cols + selectedCol;
    const cellDiv = gridElem.children[idx];

    if (cellDiv) {
        cellDiv.classList.add('selected');
        cellDiv.scrollIntoView({
            block: 'nearest', 
            inline: 'nearest' 
        });
    }
}


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
    selectedRow = 0;
    selectedCol = 0;
    highlightSelectedCell();
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
    audio.click.currentTime = 0;
    audio.click.play();
    const r = +e.currentTarget.dataset.r;
    const c = +e.currentTarget.dataset.c;
    const cell = grid[r][c];

    if (cell.flagged || cell.revealed) return;
    if (firstClick) {
        audio.bgm.currentTime = 0;
        audio.bgm.play();
        placeMines(r,c);
        starTimer();
        firstClick = false;
    }
    revealCell(r,c);
    saveGameState();
    checkWin();
}

function onCellRightClick(e) {
    audio.flag.currentTime = 0;
    audio.flag.play();
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
        audio.boom.currentTime = 0;
        audio.boom.play();
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
        if (won) {
            audio.win.currentTime = 0;
            audio.win.play();
            alert('You win!');
        } else {
            audio.bgm.pause();
            alert('Game Over');
        }
        clearGameState();
    }, 50);
}


function checkWin() {
    const unrevealed = grid.flat().filter(c => !c.revealed).length;
    if (unrevealed === totalMines) {
        gameOver(true);
    }
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


window.addEventListener('keydown', e => {
    switch (e.key) {
        case 'ArrowUp':
            if (selectedRow > 0) selectedRow--;
            e.preventDefault();
            break;
        case 'ArrowDown':
            if (selectedRow < rows - 1) selectedRow++;
            e.preventDefault();
            break;
        case 'ArrowLeft':
            if (selectedCol > 0) selectedCol--;
            e.preventDefault();
            break;
        case 'ArrowRight':
            if (selectedCol < cols - 1) selectedCol++;
            e.preventDefault();
            break;
        case 'Enter':
        case ' ':
            const clickEvent = new MouseEvent('click');
            gridElem.children[selectedRow * cols + selectedCol].dispatchEvent(clickEvent);
            e.preventDefault();
            break;
        case 'f':
        case 'F':
            const ctxEvent = new MouseEvent('contextmenu', { bubbles: true });
            gridElem.children[selectedRow * cols + selectedCol].dispatchEvent(ctxEvent);
            e.preventDefault();
            break;
        case 'r':
        case 'R':
            restartBtn.click();
            break;
        default:
            return;
    }
    highlightSelectedCell();
});


restartBtn.addEventListener('click', () => {
    clearGameState();
    initGame();
});
diffSelect.addEventListener('change', initGame);

initGame();