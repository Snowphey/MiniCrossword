const { updateDictionary } = require('./src/utils/dictionaryManager');

async function run() {
    console.log("Starting dictionary update...");
    let dict = [];
    try {
        // Keep running indefinitely until the program is closed
        while (true) {
             // Pass a large target size so it always tries to add more words
             dict = await updateDictionary(1000000);
             console.log(`Current dictionary size: ${dict.length}`);
        }
    } catch (error) {
        console.error("Error updating dictionary:", error);
    }
}

run();
