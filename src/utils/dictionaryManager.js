const fs = require('fs');
const path = require('path');
const { fetchRandomTitles, fetchDefinition } = require('./wiktionary');

const DICTIONARY_PATH = path.join(__dirname, '../data/dictionary.json');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function updateDictionary(targetSize = 200) {
    let currentDictionary = [];
    try {
        if (fs.existsSync(DICTIONARY_PATH)) {
            const data = fs.readFileSync(DICTIONARY_PATH, 'utf8');
            currentDictionary = JSON.parse(data);
        }
    } catch (e) {
        console.log("Creating new dictionary file.");
    }
    
    // Convert to Set of existing words to avoid duplicates
    const existingWords = new Set(currentDictionary.map(entry => entry.word.toUpperCase()));
    let newWordsCount = 0;
    
    console.log(`Updating dictionary... Current size: ${currentDictionary.length}`);

    let attempts = 0;
    const MAX_ATTEMPTS = 50; // Increased attempts

    while (currentDictionary.length < targetSize && attempts < MAX_ATTEMPTS) {
        attempts++;
        const potentialTitles = await fetchRandomTitles(50); // Fetch batch
        
        for (const title of potentialTitles) {
            // Filter by length (2 to 6) to support 4x4, 5x5, or 6x6 grids
            if (title.length < 2 || title.length > 6) {
                continue;
            }
            if (/[^a-zA-Zàâäéèêëîïôöùûüç]/.test(title)) {
                continue; // Keep it simple (no heavy punctuation)
            }
            
            const upperTitle = title.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Flatten accents for grid key
            
            if (existingWords.has(upperTitle)) {
                continue;
            }

            // Pause pour éviter le rate-limiting (429)
            await sleep(1000); 

            const definition = await fetchDefinition(title);
            if (definition) {
                // Formatting: First letter uppercase, trim
                const cleanDef = definition.charAt(0).toUpperCase() + definition.slice(1).trim();

                const entry = {
                    word: upperTitle,
                    original: title, // Keep original specifically for display if needed? Grid usually all caps.
                    def: cleanDef
                };
                
                currentDictionary.push(entry);
                existingWords.add(upperTitle);
                newWordsCount++;
                process.stdout.write('+'); // Progress indicator

                // Save every 5 words to prevent data loss on crash
                if (newWordsCount % 5 === 0) {
                     fs.writeFileSync(DICTIONARY_PATH, JSON.stringify(currentDictionary, null, 2), 'utf8');
                     process.stdout.write(' [Saved] ');
                }

            } else {
                process.stdout.write('.');
            }
            
            // Break early if we just need a few
            if (currentDictionary.length >= targetSize) break;
        }
    }
    
    console.log(`\nAdded ${newWordsCount} new words.`);
    
    // Save
    fs.writeFileSync(DICTIONARY_PATH, JSON.stringify(currentDictionary, null, 2), 'utf8');
    return currentDictionary;
}

module.exports = { updateDictionary };
