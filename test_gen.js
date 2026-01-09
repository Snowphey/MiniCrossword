const { generatePuzzle } = require('./src/utils/generator.js');

async function test() {
    console.log("Testing puzzle generation...");
    try {
        const puzzle = await generatePuzzle();
        console.log("Puzzle generated successfully!");
        console.log("Grid:");
        puzzle.grid.forEach(row => console.log(row.map(c => c || '#').join(' ')));
        console.log("Across:");
        puzzle.definitions.across.forEach(c => console.log(` ${c.number}. ${c.answer} : ${c.clue}`));
        console.log("Down:");
        puzzle.definitions.down.forEach(c => console.log(` ${c.number}. ${c.answer} : ${c.clue}`));
    } catch (e) {
        console.error("Generation failed:", e.message);
    }
}

test();
