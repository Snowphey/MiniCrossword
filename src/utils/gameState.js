const { generatePuzzle } = require('./generator');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/dailyState.json');

let currentPuzzle = null;
let puzzleDate = null;
const solvers = new Set(); 
const userProgress = new Map(); // Map<userId, { solvedDefs: Set<string>, startTime: number }>

function saveGameState() {
    try {
        const data = {
            puzzleDate,
            currentPuzzle,
            solvers: Array.from(solvers),
            userProgress: Array.from(userProgress.entries()).map(([uid, prog]) => ({
                userId: uid,
                solvedDefs: Array.from(prog.solvedDefs),
                startTime: prog.startTime
            }))
        };
        // Ensure directory exists
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch(e) {
        console.error("Error saving game state:", e);
    }
}

function loadGameState() {
    if (!fs.existsSync(DATA_FILE)) return;
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        if (!raw || !raw.trim()) {
            console.log("State file is empty, starting fresh.");
            return;
        }
        const data = JSON.parse(raw);
        
        if (data.puzzleDate) {
            puzzleDate = data.puzzleDate;
            currentPuzzle = data.currentPuzzle;
            
            solvers.clear();
            if (Array.isArray(data.solvers)) {
                data.solvers.forEach(s => solvers.add(s));
            }
            
            userProgress.clear();
            if (Array.isArray(data.userProgress)) {
                data.userProgress.forEach(p => {
                    userProgress.set(p.userId, {
                        solvedDefs: new Set(p.solvedDefs),
                        startTime: p.startTime
                    });
                });
            }
            console.log(`State loaded for date: ${puzzleDate}`);
        }
    } catch(e) {
        console.error("Error loading game state:", e);
    }
}

// Attempt to load state on startup
loadGameState();

async function getDailyPuzzle() {
    const today = new Date().toDateString();
    
    // Check if we need a new puzzle
    if (puzzleDate !== today || !currentPuzzle) {
        try {
            console.log("Generating new daily puzzle...");
            currentPuzzle = await generatePuzzle();
            puzzleDate = today;
            solvers.clear();
            userProgress.clear();
            saveGameState();
            console.log("New daily puzzle generated and saved for:", today);
        } catch (e) {
            console.error("Error generating puzzle:", e);
        }
    }
    return currentPuzzle;
}

function getUserProgress(userId) {
    if (!userProgress.has(userId)) {
        userProgress.set(userId, { solvedDefs: new Set(), startTime: Date.now() });
    }
    return userProgress.get(userId);
}

async function checkGuess(userId, direction, number, guessWord) {
     let puzzle = await getDailyPuzzle();
     if (!puzzle) return { valid: false, reason: "Puzzle non disponible." };
     
     // Normalize direction input (assuming command passes 'across' or 'down')
     const dirKey = direction.toLowerCase() === 'horizontal' ? 'across' : 'down';
     const defs = puzzle.definitions[dirKey];
     
     const target = defs.find(d => d.number === number);
     
     if (!target) return { valid: false, reason: "Définition introuvable (Vérifiez le numéro et la direction)" };
     
     const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

     if (normalize(guessWord) === normalize(target.answer)) {
         const progress = getUserProgress(userId);
         const key = `${dirKey}-${number}`;
         
         let isNew = !progress.solvedDefs.has(key);
         progress.solvedDefs.add(key);

         // Auto-detect fully revealed words
         const currentGrid = getUserGrid(userId);
         const extraRevealed = [];

         ['across', 'down'].forEach(d => {
             const defs = puzzle.definitions[d] || [];
             defs.forEach(def => {
                 const defKey = `${d}-${def.number}`;
                 if (!progress.solvedDefs.has(defKey)) {
                     let isFilled = true;
                     const { row, col, answer } = def;
                     if (d === 'across') {
                         for (let i = 0; i < answer.length; i++) {
                             if (!currentGrid[row][col + i]) { isFilled = false; break; }
                         }
                     } else {
                         for (let i = 0; i < answer.length; i++) {
                             if (!currentGrid[row + i][col]) { isFilled = false; break; }
                         }
                     }
                     if (isFilled) {
                         progress.solvedDefs.add(defKey);
                         extraRevealed.push({
                             direction: d === 'across' ? 'Horizontal' : 'Vertical',
                             number: def.number,
                             word: def.answer
                         });
                     }
                 }
             });
         });
         
         saveGameState();

         // Check completion
         const totalDefs = (puzzle.definitions.across?.length || 0) + (puzzle.definitions.down?.length || 0);
         const isComplete = progress.solvedDefs.size === totalDefs;
         
         return { valid: true, isComplete, isNew, extraRevealed };
     } else {
         return { valid: false, reason: "Ce n'est pas le bon mot." };
     }
}

function markSolved(userId) {
    solvers.add(userId);
    saveGameState();
}

function hasAlreadyWon(userId) {
    return solvers.has(userId);
}

function getUserGrid(userId) {
    if (!currentPuzzle) return null;
    const progress = getUserProgress(userId);
    const size = currentPuzzle.grid.length;
    
    // Create grid filled with nulls or #
    const resultGrid = currentPuzzle.grid.map(row => row.map(cell => cell === '#' ? '#' : null));
    
    progress.solvedDefs.forEach(key => {
        const [dir, numStr] = key.split('-');
        const num = parseInt(numStr);
        const def = currentPuzzle.definitions[dir].find(d => d.number === num);
        
        if (def) {
            const { row, col, answer } = def;
            if (dir === 'across') {
                for (let i = 0; i < answer.length; i++) {
                    resultGrid[row][col + i] = answer[i];
                }
            } else {
                 for (let i = 0; i < answer.length; i++) {
                    resultGrid[row + i][col] = answer[i];
                }
            }
        }
    });

    return resultGrid;
}

module.exports = { 
    getDailyPuzzle, 
    solvers,
    checkGuess,
    markSolved,
    hasAlreadyWon,
    getUserProgress,
    getUserGrid
};
