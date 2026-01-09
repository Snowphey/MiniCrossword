const fs = require('fs');
const path = require('path');
const { updateDictionary } = require('./dictionaryManager');

const dictionaryPath = path.join(__dirname, '../data/dictionary.json');

function loadDictionary() {
    try {
        const data = fs.readFileSync(dictionaryPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Helper to create an empty 5x5 grid
function createEmptyGrid(size = 5) {
    return Array(size).fill(null).map(() => Array(size).fill(''));
}

// Add random black cells (represented by '#')
function addBlackCells(grid, count = 3) {
    const size = grid.length;
    let placed = 0;
    while (placed < count) {
        const r = Math.floor(Math.random() * size);
        const c = Math.floor(Math.random() * size);
        if (grid[r][c] !== '#') {
            grid[r][c] = '#';
            placed++;
        }
    }
    // Simple check to ensure not too many blocks blocking everything?
    // For a mini crossword, let's keep it simple.
    return grid;
}

// Get all horizontal and vertical slots
function getSlots(grid) {
    const slots = [];
    const size = grid.length;

    // Horizontal
    for (let r = 0; r < size; r++) {
        let start = -1;
        for (let c = 0; c <= size; c++) { // iterate to size to process end of row
            if (c < size && grid[r][c] !== '#') {
                if (start === -1) start = c;
            } else {
                if (start !== -1) {
                    if (c - start >= 2) { // Minimum word length 2
                        slots.push({ type: 'across', r, c: start, length: c - start });
                    }
                    start = -1;
                }
            }
        }
    }

    // Vertical
    for (let c = 0; c < size; c++) {
        let start = -1;
        for (let r = 0; r <= size; r++) {
            if (r < size && grid[r][c] !== '#') {
                if (start === -1) start = r;
            } else {
                if (start !== -1) {
                    if (r - start >= 2) {
                        slots.push({ type: 'down', r: start, c, length: r - start });
                    }
                    start = -1;
                }
            }
        }
    }
    return slots;
}

// Optimized backtracking solver
function fillGrid(grid, slots, slotIndex, dictionaryByLength, usedWords, stats) {
    if (stats.steps++ > stats.maxSteps) return false; // Fail fast if taking too long
    if (slotIndex >= slots.length) return true; // All slots filled

    const slot = slots[slotIndex];
    const { type, r, c, length } = slot;

    // Get current pattern in the slot
    const pattern = [];
    for (let i = 0; i < length; i++) {
        if (type === 'across') pattern.push(grid[r][c + i]);
        else pattern.push(grid[r + i][c]);
    }

    // Get candidates efficiently
    const candidates = (dictionaryByLength[length] || []).filter(entry => {
        if (usedWords.has(entry.word)) return false; // Prevent using same word twice
        
        for (let i = 0; i < length; i++) {
            if (pattern[i] !== '' && pattern[i] !== entry.word[i]) return false;
        }
        return true;
    });

    if (candidates.length === 0) return false;

    // Sort candidates: prioritize those that intersect well? 
    // Random shuffle is fine for variety, but limiting candidates might speed up
    // Let's randomize but limit branching factor if too deep?
    candidates.sort(() => Math.random() - 0.5);

    for (const candidate of candidates) {
        const word = candidate.word;
        
        // Save state
        const previousState = [];
        for (let i = 0; i < length; i++) {
            if (type === 'across') {
                previousState.push(grid[r][c + i]);
                grid[r][c + i] = word[i];
            } else {
                previousState.push(grid[r + i][c]);
                grid[r + i][c] = word[i];
            }
        }

        usedWords.add(word);

        if (fillGrid(grid, slots, slotIndex + 1, dictionaryByLength, usedWords, stats)) {
            slot.word = word;
            slot.definition = candidate.def;
            return true;
        }

        // Backtrack
        usedWords.delete(word);
        for (let i = 0; i < length; i++) {
            if (type === 'across') grid[r][c + i] = previousState[i];
            else grid[r + i][c] = previousState[i];
        }
    }

    return false;
}

async function generatePuzzle() {
    const dictionary = loadDictionary();

    // Group dictionary by length for performance
    const dictionaryByLength = {};
    dictionary.forEach(entry => {
        const len = entry.word.length;
        if (!dictionaryByLength[len]) dictionaryByLength[len] = [];
        dictionaryByLength[len].push(entry);
    });
    
    // Retry logical loop
    for (let attempt = 0; attempt < 50; attempt++) {
        const size = 5 + Math.floor(Math.random() * 2); // 5 or 6
        const grid = createEmptyGrid(size);
        // Reduce black cells slightly to ensure better connectivity or make it easier?
        // Actually fewer black cells = longer words = harder constraints.
        // More black cells = shorter words = easier.
        const numBlackCells = Math.floor(size * size * 0.15) + Math.floor(Math.random() * 2); 
        addBlackCells(grid, numBlackCells);
        
        const slots = getSlots(grid);
        
        // Sort slots: Fill longest words first significantly improves performance (fail-fast)
        slots.sort((a, b) => b.length - a.length);

        // Limit timeout per grid attempt using a simple counter in recursive loop
        // JS single-threaded recursion limit...
        
        const stats = { steps: 0, maxSteps: 20000 }; // Fail after 20k steps to try next grid
        if (fillGrid(grid, slots, 0, dictionaryByLength, new Set(), stats)) {

            // Success!
            // Clean up definitions structure
            const across = slots.filter(s => s.type === 'across').map((s, i) => ({
                number: i + 1, // Numbering logic is usually more complex (numbered by cell index)
                clue: s.definition,
                answer: s.word,
                length: s.length,
                row: s.r,
                col: s.c
            }));
            
            // Standard crossword numbering:
            // 1. Traverse grid left-to-right, top-to-bottom.
            // 2. If a cell is start of an across or down word, it gets a number.
            
            let clueNumber = 1;
            const definitions = { across: [], down: [] };
            
            for(let r=0; r<size; r++) {
                for(let c=0; c<size; c++) {
                    if (grid[r][c] === '#') continue;
                    
                    const isAcrossStart = (c === 0 || grid[r][c-1] === '#') && (c + 1 < size && grid[r][c+1] !== '#');
                    const isDownStart = (r === 0 || grid[r-1][c] === '#') && (r + 1 < size && grid[r+1][c] !== '#');
                    
                    if (isAcrossStart || isDownStart) {
                        const currentNum = clueNumber++;
                        if (isAcrossStart) {
                            // Find the slot object effectively
                            // Simplified: Just re-find the word length?
                            // We used 'slots' before, we can look it up.
                           
                           // Find the slot that starts at r, c and is across
                           const s = slots.find(s => s.type === 'across' && s.r === r && s.c === c);
                           if(s) definitions.across.push({ number: currentNum, clue: s.definition, answer: s.word, length: s.length, row: r, col: c });
                        }
                        if (isDownStart) {
                           const s = slots.find(s => s.type === 'down' && s.r === r && s.c === c);
                           if(s) definitions.down.push({ number: currentNum, clue: s.definition, answer: s.word, length: s.length, row: r, col: c });
                        }
                    }
                }
            }

            return { grid, definitions, id: Date.now() };
        }
    }
    throw new Error("Failed to generate a valid puzzle after multiple attempts. Add more words to dictionary.");
}

module.exports = { generatePuzzle };
