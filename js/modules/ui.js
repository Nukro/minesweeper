export function renderGrid(gridElem, rows, cols, grid, onCellClick, onCellRightClick) {
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

            if (cell.revealed) {
                div.classList.add('revealed');
                if (cell.mine) {
                    div.classList.add('mine');
                } else if (cell.neighborMines > 0) {
                    div.textContent = cell.neighborMines;
                    div.classList.add(`num${cell.neighborMines}`);
                }
            }

            if (cell.flagged) {
                div.classList.add('flagged');
            }

            gridElem.append(div);
        }
    }
}

export function highlightSelectedCell(gridElem, selectedRow, selectedCol, cols) {
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


export function updateStatsUI(stats) {
    document.getElementById('games-played').textContent = stats.played;
    document.getElementById('games-won').textContent = stats.won;
    const rate = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
    document.getElementById('win-rate').textContent = rate + '%';
}

export function updateHighscoresUI(highscores) {
    document.getElementById('hs-beginner').textContent = highscores.beginner !== null ? highscores.beginner + 's' : '–';
    document.getElementById('hs-intermediate').textContent = highscores.intermediate !== null ? highscores.intermediate + 's' : '–';
    document.getElementById('hs-expert').textContent = highscores.expert !== null ? highscores.expert + 's' : '–';
}

export function restoreUI(timerEl, elapsed, mineCountEl, totalMines, grid) {
    timerEl.textContent = `Time: ${elapsed}s`;
    const flaggedCount = grid.flat().filter(c => c.flagged).length;
    mineCountEl.textContent = `Mines: ${totalMines - flaggedCount}`;
}


export function setupSafeClick(safeClickBtn, safeClicksRemaining, onSafeClick) {
    safeClickBtn.textContent = `Safe Click (${safeClicksRemaining})`;
    safeClickBtn.addEventListener('click', onSafeClick);
}
