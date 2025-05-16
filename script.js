const gridElem = document.getElementById('grid');
const mineCountEl = document.getElementById('mine-count');
const timerEl = document.getElementById('timer');
const diffSelect = document.getElementById('difficulty');
const restartBtn = document.getElementById('restart');

let rows, cols, totalMines;
let grid = [];
let timerId = null, elapsed = 0;

function initGame() {
    clearInterval(timerId);
    elapsed = 0;
    timerEl.textContent = `Time: 0s`;

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

            gridElem.append(div);
        }
    }
}

initGame();