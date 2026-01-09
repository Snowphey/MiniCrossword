const fs = require('fs');
const path = require('path');
const readline = require('readline');

const INPUT_FILE = path.join(__dirname, 'fr-extract.jsonl');
const OUTPUT_FILE = path.join(__dirname, 'src/data/dictionary.json');

// Regex to validate words: strictly letters and french accents.
// No spaces, hyphens, digits.
const ALLOWED_CHARS_REGEX = /^[a-zA-Zàâäéèêëîïôöùûüç]+$/;

// Standardize word: remove accents, uppercase
function normalizeWord(word) {
    return word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function cleanDefinition(def) {
    if (!def) return "";
    let cleaned = def.trim();
    if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    return cleaned;
}

async function run() {
    console.log("Starting dictionary population from fr-extract.jsonl...");

    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`File not found: ${INPUT_FILE}`);
        return;
    }

    // Create stream and interface
    const fileStream = fs.createReadStream(INPUT_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const dictionary = new Map();
    let processedCount = 0;
    let addedCount = 0;

    for await (const line of rl) {
        processedCount++;
        if (processedCount % 100000 === 0) {
            process.stdout.write(`Processed ${processedCount} lines. Words kept: ${addedCount}\r`);
        }

        try {
            const entry = JSON.parse(line);

            // Filter for French
            if (entry.lang_code !== 'fr') continue;

            const word = entry.word;
            if (!word) continue;

            // Length filter: 2 to 6
            if (word.length < 2 || word.length > 6) continue;

            // Check valid characters
            if (!ALLOWED_CHARS_REGEX.test(word)) continue;

            // Extract definition with filtering
            let definition = null;
            if (entry.senses && entry.senses.length > 0) {
                const invalidStarts = [
                    'Du verbe', 
                    'De l’adjectif',
                    'Féminin',
                    'Masculin',
                    'Pluriel',
                    'Forme de', 
                    'Participe', 
                    'Première personne', 
                    'Deuxième personne', 
                    'Troisième personne', 
                    'Variante', 
                    'Génitif', 
                    'Relatif',
                    "Nom de famille",
                    "Prénom",
                    "Langue",
                    "Commune",
                    "Ville",
                    "Village",
                    "Hameau",
                    "Région",
                    "Rivière",
                    "Fleuve",
                    "Lac",
                    "Affluent",
                    "Montagne",
                    "Île",
                ];

                for (const sense of entry.senses) {
                    if (!sense.glosses) continue;
                    
                    for (const gloss of sense.glosses) {
                        const text = gloss.trim();
                        
                        // Nettoyage temporaire pour vérification du début de phrase
                        // On enlève tout ce qui est entre parenthèses au début pour vérifier "invalidStarts"
                        const textWithoutParens = text.replace(/^\([^)]+\)\s*/, '').trim();
                        
                        // Vérification si la définition commence par une tournure invalide
                        // Ou si elle contient le mot lui-même (case insensitive, mot entier seulement)
                        const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
                        
                        const isInvalid = invalidStarts.some(start => 
                            textWithoutParens.toLowerCase().startsWith(start.toLowerCase()) || 
                            text.length < 5 
                        ) || wordRegex.test(text);

                        if (!isInvalid) {
                            definition = text;

                            // Common tag mappings (English code -> French display)
                            const tagMappings = {
                                // Register & Style
                                "slang": "Argot",
                                "familiar": "Familier",
                                "pejorative": "Péjoratif",
                                "rare": "Rare",
                                "archaic": "Archaïque",
                                "obsolete": "Désuet",
                                "dated": "Désuet",
                                "figuratively": "Figuré",
                                "ironic": "Ironique",
                                "humorous": "Humoristique",
                                "formal": "Soutenu",
                                "informal": "Informel",
                                "vulgar": "Vulgaire",
                                "offensive": "Injurieux",
                                "colloquial": "Familier",
                                "poetic": "Poétique",
                                "literary": "Littéraire",
                                "childish": "Enfantin",
                                "euphemism": "Euphémisme",
                                "hyperbole": "Hyperbole",
                                "neologism": "Néologisme",
                                "rhetoric": "Rhétorique",
                                "metonymically": "Par métonymie",
                                "analogy": "Par analogie",
                                "broadly": "Par extension",
                                "ellipsis": "Par ellipse",
                                "literally": "Littéralement",
                                
                                // Grammar / Usage
                                "Anglicism": "Anglicisme",
                                "pronominal": "Pronominal",
                                "intransitive": "Intransitif",
                                "transitive": "Transitif",
                                "uncountable": "Indénombrable",
                                "plural": "Pluriel",
                                "singular": "Singulier",
                                "collective": "Collectif",
                                "specifically": "En particulier",
                                "especially": "En particulier",

                                // Eras
                                "Ancient": "Antiquité",
                                "Middle-Ages": "Moyen Âge"
                            };

                            // Common topic mappings (English code -> French display)
                            // Based on top 100 occurring topics
                            const topicMappings = {
                                "geography": "Géographie",
                                "botany": "Botanique",
                                "medicine": "Médecine",
                                "chemistry": "Chimie",
                                "zoology": "Zoologie",
                                "music": "Musique",
                                "history": "Histoire",
                                "ex-history": "Histoire",
                                "anatomy": "Anatomie",
                                "linguistic": "Linguistique",
                                "ornithology": "Ornithologie",
                                "nautical": "Marine",
                                "religion": "Religion",
                                "law": "Droit",
                                "computing": "Informatique",
                                "politics": "Politique",
                                "military": "Militaire",
                                "cuisine": "Cuisine",
                                "Food and Drink": "Cuisine",
                                "mineralogy": "Minéralogie",
                                "agriculture": "Agriculture",
                                "biology": "Biologie",
                                "metrology": "Métrologie",
                                "astronomy": "Astronomie",
                                "sports": "Sport",
                                "sport": "Sport",
                                "biochemistry": "Biochimie",
                                "mathematics": "Mathématiques",
                                "technical": "Technique",
                                "geology": "Géologie",
                                "architecture": "Architecture",
                                "heraldry": "Héraldique",
                                "entomology": "Entomologie",
                                "electricity": "Électricité",
                                "finance": "Finance",
                                "philosophy": "Philosophie",
                                "art": "Art",
                                "ichthyology": "Ichtyologie",
                                "clothing": "Vêtement",
                                "education": "Éducation",
                                "psychology": "Psychologie",
                                "construction": "Construction",
                                "ecology": "Écologie",
                                "grammar": "Grammaire",
                                "sexuality": "Sexualité",
                                "fishing": "Pêche",
                                "commerce": "Commerce",
                                "mycology": "Mycologie",
                                "cartography": "Cartographie",
                                "mechanical": "Mécanique",
                                "mechanics": "Mécanique",
                                "hunting": "Chasse",
                                "telecommunications": "Télécom.",
                                "sociology": "Sociologie",
                                "transport": "Transport",
                                "geometry": "Géométrie",
                                "automobile": "Automobile",
                                "textiles": "Textile",
                                "Christianity": "Christianisme",
                                "literature": "Littérature",
                                "programming": "Programmation",
                                "surgery": "Chirurgie",
                                "astronautics": "Astronautique",
                                "meteorology": "Météorologie",
                                "pharmacology": "Pharmacologie",
                                "mammalogy": "Mammalogie",
                                "metallurgy": "Métallurgie",
                                "forestry": "Sylviculture",
                                "typography": "Typographie",
                                "carpentry": "Charpenterie",
                                "mythology": "Mythologie",
                                "games": "Jeux",
                                "railways": "Chemin de fer",
                                "Islam": "Islam",
                                "aeronautics": "Aéronautique",
                                "cycling": "Cyclisme",
                                "film": "Cinéma",
                                "cinema": "Cinéma",
                                "masonry": "Maçonnerie",
                                "technology": "Technologie",
                                "theater": "Théâtre",
                                "numismatics": "Numismatique",
                                "psychiatry": "Psychiatrie",
                                "physiology": "Physiologie",
                                "dance": "Danse",
                                "oenology": "Œnologie",
                                "equestrianism": "Équitation",
                                "biogeography": "Biogéographie",
                                "photography": "Photographie",
                                "Catholicism": "Catholicisme",
                                "beverages": "Boisson",
                                "marketing": "Marketing",
                                "police": "Police",
                                "Internet": "Internet",
                                "furniture": "Mobilier",
                                "accounting": "Comptabilité",
                                "soccer": "Football",
                                "nobility": "Noblesse",
                                "anthropology": "Anthropologie",
                                "sewing": "Couture",
                                "journalism": "Journalisme",
                                "poetry": "Poésie",
                                "malacology": "Malacologie",
                                "science": "Sciences",
                                "ophthalmology": "Ophtalmologie",
                                "physical": "Physique",
                                "aviation": "Aviation"
                            };

                            let tagsToPrepend = [];

                            // Process 'tags' (usually English codes)
                            if (sense.tags && Array.isArray(sense.tags)) {
                                for (const tag of sense.tags) {
                                    if (tagMappings[tag]) {
                                        tagsToPrepend.push(tagMappings[tag]);
                                    }
                                }
                            }

                            // Process 'topics' (usually English codes like 'medicine')
                            if (sense.topics && Array.isArray(sense.topics)) {
                                for (const topic of sense.topics) {
                                    if (topicMappings[topic]) {
                                        tagsToPrepend.push(topicMappings[topic]);
                                    }
                                }
                            }

                            // Process 'raw_tags' (usually raw text like 'Biologie', 'Belgique')
                            if (sense.raw_tags && Array.isArray(sense.raw_tags)) {
                                tagsToPrepend.push(...sense.raw_tags);
                            }

                            // Add unique tags to definition
                            if (tagsToPrepend.length > 0) {
                                // Filter unique and wrap in parentheses
                                const uniqueTags = [...new Set(tagsToPrepend)];
                                const tagsPrefix = uniqueTags.map(t => `(${t})`).join(' ');
                                definition = `${tagsPrefix} ${definition}`;
                            }
                            
                            break;
                        }
                    }
                    if (definition) break;
                }
            }

            if (!definition) continue;

            const normalized = normalizeWord(word);

            // Add unique words. Priority: First one found.
            if (!dictionary.has(normalized)) {
                dictionary.set(normalized, {
                    word: normalized,
                    original: word,
                    def: cleanDefinition(definition)
                });
                addedCount++;
            }

        } catch (err) {
            continue;
        }
    }

    console.log(`\nFinished processing. Total unique words: ${addedCount}`);
    
    // Sort and save
    console.log("Sorting dictionary...");
    const sortedDictionary = Array.from(dictionary.values())
        .sort((a, b) => a.word.localeCompare(b.word));

    console.log(`Writing to ${OUTPUT_FILE}...`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sortedDictionary, null, 2), 'utf8');
    console.log("Done.");
}

run();
