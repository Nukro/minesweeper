const STORAGE_KEY = 'minesweeperState';
const STORAGE_KEY_STATS = 'minesweeperStats';
const STORAGE_KEY_HS = 'minesweeperHighscores';

export function saveGameState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadGameState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
}

export function clearGameState() {
    localStorage.removeItem(STORAGE_KEY);
}

export function loadStats() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_STATS)) || { played: 0, won: 0 };
}

export function saveStats(stats) {
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
}

export function loadHighscores() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_HS)) || {
        beginner: null,
        intermediate: null,
        expert: null
    };
}

export function saveHighscores(highscores) {
    localStorage.setItem(STORAGE_KEY_HS, JSON.stringify(highscores));
}