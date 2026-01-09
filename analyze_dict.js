const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('./src/data/dictionary.json', 'utf8'));
    console.log(`Total words: ${data.length}`);
    
    const distribution = {};
    data.forEach(entry => {
        const len = entry.word.length;
        distribution[len] = (distribution[len] || 0) + 1;
    });
    
    console.log("Length distribution:");
    Object.keys(distribution).sort().forEach(len => {
        console.log(`Length ${len}: ${distribution[len]} words`);
    });
    
} catch (e) {
    console.error("Error reading dictionary:", e.message);
}
