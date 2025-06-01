import { playSound, startBgm, stopBgm } from './modules/audio.js';
import {
    saveGameState, loadGameState, clearGameState,
    loadStats, saveStats,
    loadHighscores, saveHighscores
} from './modules/storage.js';

import {
    renderGrid,
    highlightSelectedCell,
    updateStatsUI,
    updateHighscoresUI,
    restoreUI,
    setupSafeClick
} from './modules/ui.js';


const gridElem = document.getElementById('grid');
const mineCountEl = document.getElementById('mine-count');
const timerEl = document.getElementById('timer');
const diffSelect = document.getElementById('difficulty');
const restartBtn = document.getElementById('restart');
const safeClickBtn = document.getElementById('safeClickBtn');


let rows, cols, totalMines;
let grid = [];
let timerId = null;
let elapsed = 0;
let firstClick = true;
let selectedRow = 0;
let selectedCol = 0;
let safeClicksRemaining = 3;
let stats = loadStats();
let highscores = loadHighscores();


function buildStateObject() {
    const plainGrid = grid.map(row =>
        row.map(cell => ({
            mine: cell.mine,
            neighborMines: cell.neighborMines,
            revealed: cell.revealed,
            flagged: cell.flagged
        }))
    );
    return {
        rows,
        cols,
        totalMines,
        elapsed,
        firstClick,
        safeClicksRemaining,
        plainGrid,
        difficulty: diffSelect.value
    };
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

    safeClicksRemaining = state.safeClicksRemaining ?? 3;
}


function onCellClick(e) {
    playSound('click');
    const r = +e.currentTarget.dataset.r;
    const c = +e.currentTarget.dataset.c;
    const cell = grid[r][c];

    if (cell.flagged || cell.revealed) return;
    if (firstClick) {
        startBgm();
        placeMines(r, c);
        startTimer();
        firstClick = false;
    }
    revealCell(r, c);
    saveGameState(buildStateObject());
    checkWin();
}


function onCellRightClick(e) {
    playSound('flag');
    e.preventDefault();
    const r = +e.currentTarget.dataset.r;
    const c = +e.currentTarget.dataset.c;
    const cell = grid[r][c];

    if (cell.revealed) return;
    cell.flagged = !cell.flagged;

    if (cell.flagged) {
        e.currentTarget.classList.add('flagged');
    } else {
        e.currentTarget.classList.remove('flagged');
    }

    saveGameState(buildStateObject());
    
    const flaggedCount = grid.flat().filter(c => c.flagged).length;
    mineCountEl.textContent = `Mines: ${totalMines - flaggedCount}`;
}


function startTimer() {
    timerId = setInterval(() => {
        elapsed++;
        timerEl.textContent = `Time: ${elapsed}s`;
        saveGameState(buildStateObject());
    }, 1000);
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
    const dirs = [-1, 0, 1];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let count = 0;
            dirs.forEach(dr => 
                dirs.forEach(dc => {
                    if (dr || dc) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].mine) count++;
                    }
                })
            );
            grid[r][c].neighborMines = count;
        }
    }
}


function revealCell(r, c) {
    const cell = grid[r][c];
    const div = gridElem.children[r * cols + c];

    if (cell.revealed || cell.flagged) return;
    cell.revealed = true;
    div.classList.add('revealed');

    if (cell.mine) {
        playSound('boom');
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
                const nr = r + dr;
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
        recordStats(won);
        if (won) {
            playSound('win');
            checkHighscore(elapsed);
            alert('You win!');

        } else {
            stopBgm();
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


function recordStats(won) {
    stats.played++;
    if (won) stats.won++;
    saveStats(stats);
    updateStatsUI(stats);
}


function checkHighscore(timeSec) {
    const diff = diffSelect.value;
    const best = highscores[diff];
    if (best === null || timeSec < best) {
        highscores[diff] = timeSec;
        saveHighscores(highscores);
        updateHighscoresUI(highscores);
        alert(`Neuer Bestzeit (${diff}): ${timeSec}s!`);
    }
}


function safeClick() {
    if (safeClicksRemaining <= 0) {
        alert("Keine Safe-Clicks mehr übrig!");
        return;
    }

    const candidates = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = grid[r][c];
            if (!cell.revealed && !cell.flagged && !cell.mine) {
                candidates.push({ r, c });
            }
        }
    }

    if (candidates.length === 0) {
        alert("Kein sicheres Feld gefunden!");
        return;
    }

    const { r, c } = candidates[Math.floor(Math.random() * candidates.length)];
    const cell = grid[r][c];
    cell.revealed = true;

    const idx = r * cols + c;
    const div = gridElem.children[idx];
    div.classList.add('revealed');
    if (cell.neighborMines > 0) {
        div.textContent = cell.neighborMines;
        div.classList.add(`num${cell.neighborMines}`);
    }

    safeClicksRemaining--;
    safeClickBtn.textContent = `Safe Click (${safeClicksRemaining})`;
}


function initGame() {
    clearInterval(timerId);
    elapsed = 0;
    timerEl.textContent = `Time: 0s`;
    firstClick = true;

    const diff = diffSelect.value;
    if (diff === 'beginner') {
        rows = 9; cols = 9; totalMines = 10;

    } else if (diff === 'intermediate') {
        rows = 16; cols = 16; totalMines = 40;

    } else {
        rows = 16; cols = 30; totalMines = 99;
    }

    mineCountEl.textContent = `Mines: ${totalMines}`;
    grid = createEmptyGrid(rows, cols);

    renderGrid(gridElem, rows, cols, grid, onCellClick, onCellRightClick);

    selectedRow = 0;
    selectedCol = 0;
    highlightSelectedCell(gridElem, selectedRow, selectedCol, cols);

    safeClicksRemaining = 3;
    setupSafeClick(safeClickBtn, safeClicksRemaining, safeClick);
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


window.addEventListener('DOMContentLoaded', () => {
    updateStatsUI(stats);
    updateHighscoresUI(highscores);
});


window.addEventListener('load', () => {
    const state = loadGameState();
    if (state) {
        if (confirm('Resume your last game?')) {
            rebuildData(state);
            renderGrid(gridElem, rows, cols, grid, onCellClick, onCellRightClick);

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

            restoreUI(timerEl, state.elapsed, mineCountEl, totalMines, grid);
            firstClick = state.firstClick;

            if (!firstClick) startTimer();
            highlightSelectedCell(gridElem, selectedRow, selectedCol, cols);
            setupSafeClick(safeClickBtn, safeClicksRemaining, safeClick);

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
            gridElem.children[selectedRow * cols + selectedCol].click();
            e.preventDefault();
            break;
        case 'f':
        case 'F':
            gridElem.children[selectedRow * cols + selectedCol].dispatchEvent(
                new MouseEvent('contextmenu', { bubbles: true })
            );
            e.preventDefault();
            break;
        case 'r':
        case 'R':
            restartBtn.click();
            break;
        default:
            return;
    }
    highlightSelectedCell(gridElem, selectedRow, selectedCol, cols);
});

restartBtn.addEventListener('click', () => {
    clearGameState();
    initGame();
});

diffSelect.addEventListener('change', initGame);

initGame();
