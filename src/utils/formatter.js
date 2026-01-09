function formatGrid(grid, definitions) {
    let gridString = '```\n';
    const size = grid.length;
    const topBorder = '+---'.repeat(size) + '+';
    gridString += topBorder + '\n';

    for (let r = 0; r < size; r++) {
        let rowLine = '|';
        for (let c = 0; c < size; c++) {
            const cell = grid[r][c];
            if (cell === '#') {
                rowLine += '###|';
            } else {
                // Check if this cell is a start number
                const across = definitions.across.find(d => d.row === r && d.col === c);
                const down = definitions.down.find(d => d.row === r && d.col === c);
                const num = across ? across.number : (down ? down.number : null);
                
                // Content priority: Letter > Number > Space
                if (cell && cell !== ' ' && cell.length === 1 && /[a-zA-Z]/.test(cell)) { 
                     if (num) {
                         // Combine Number and Letter if both exist (e.g. "1A ")
                         rowLine += `${num}${cell.toUpperCase()}`.padEnd(3, ' ') + '|';
                     } else {
                         rowLine += ` ${cell.toUpperCase()} |`; 
                     }
                } else if (num) {
                    rowLine += `${num.toString().padEnd(3, ' ')}|`;
                } else {
                    rowLine += '   |';
                }
            }
        }
        gridString += rowLine + '\n';
        gridString += topBorder + '\n';
    }
    gridString += '```';
    return gridString;
}

module.exports = { formatGrid };
