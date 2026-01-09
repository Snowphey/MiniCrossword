const axios = require('axios');
const cheerio = require('cheerio');

// Wiktionary API client

// Action API for random words
const ACTION_API = 'https://fr.wiktionary.org/w/api.php';
// REST API for definitions
const REST_API = 'https://fr.wiktionary.org/api/rest_v1/page/definition';

const HEADERS = {
    'User-Agent': 'DiscordMiniCrosswordBot/1.0 (Educational Project)'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchRandomTitles(limit = 50) {
    try {
        const titles = [];
        // Use user provided anagrimes tool which filters well
        // URL: https://anagrimes.toolforge.org/hasard.php?langue=fr
        
        const batchSize = Math.min(limit, 10);
        
        for(let i=0; i<batchSize; i++) {
            try {
                // Séquentiel avec délai pour éviter de surcharger Anagrimes/Toolforge
                if (i > 0) await sleep(500);

                const response = await axios.get('https://anagrimes.toolforge.org/hasard.php?langue=fr', {
                    maxRedirects: 5,
                    headers: HEADERS,
                    validateStatus: status => status >= 200 && status < 400
                });

                // The axios response after redirect has the final URL
                // e.g. https://fr.wiktionary.org/wiki/mot_trouve
                const finalUrl = response.request.res.responseUrl;
                if (finalUrl && finalUrl.includes('/wiki/')) {
                    const title = decodeURIComponent(finalUrl.split('/wiki/')[1]).replace(/_/g, ' ');
                    if (title) {
                        titles.push(title);
                    }
                }
            } catch (err) {
                 console.error(`Error fetching random title (attempt ${i+1}):`, err.message);
                 // Continue next
            }
        }
        
        return titles;

    } catch (error) {
        console.error('Error fetching random titles:', error.message);
        return [];
    }
}

async function fetchDefinition(word) {
    try {
        console.log(`Fetching definition for: ${word}`);
        let response;
        let retries = 3;
        
        while (retries > 0) {
            try {
                response = await axios.get(`https://fr.wiktionary.org/wiki/${encodeURIComponent(word)}`, {
                    headers: HEADERS
                });
                break; // Success
            } catch (err) {
                if (err.response && err.response.status === 429) {
                    console.log(`Rate limit hit for ${word}. Waiting...`);
                    await sleep(2000 + Math.random() * 1000);
                    retries--;
                } else {
                    throw err; // Other error
                }
            }
        }

        if (!response) return null;
        
        const $ = cheerio.load(response.data);
        
        const validPOS = ['Nom commun', 'Adjectif', 'Verbe', 'Adverbe'];
        const invalidStarts = [
            'Du verbe', 'De l’adjectif', 'De le', 'Pluriel de', 'Féminin de', 'Masculin de', 
            'Singulier de', 'Forme de', 'Participe passé', 'Première personne', 'Deuxième personne', 
            'Troisième personne', 'Variante', 'Génitif ', 'Relatif'
        ];

        let definition = null;

        // On cherche les sections qui correspondent aux POS valides
        // Généralement dans mw-parser-output, les titres de section sont des h3 ou h4
        const sections = $('.mw-parser-output h3, .mw-parser-output h4');

        sections.each((i, elem) => {
            if (definition) return false; // Si on a déjà trouvé, on sort

            // Fallback: si .mw-headline n'existe pas, on prend tout le texte du titre
            let titleText = $(elem).find('.mw-headline').text().trim();
            if(!titleText) {
                titleText = $(elem).text().trim();
            }
            

            // Vérifie si le titre correspond à une catégorie grammaticale valide
            const isValidCategory = validPOS.some(pos => titleText.includes(pos));

            if (isValidCategory) {
                
                // Fix pour les nouvelles versions de MediaWiki où les h3/h4 sont dans des div.mw-heading
                let $scanNode = $(elem);
                if ($scanNode.parent().hasClass('mw-heading')) {
                    $scanNode = $scanNode.parent();
                }

                // On regarde les éléments suivants jusqu'au prochain titre ou wrapper de titre
                let $next = $scanNode.next();
                
                while ($next.length) {
                    // Arrêt si on rencontre un titre directement ou un wrapper de titre
                    if ($next.is('h3') || $next.is('h4') || $next.hasClass('mw-heading')) {
                        break;
                    }

                    const tagName = $next.prop('tagName') ? $next.prop('tagName').toLowerCase() : 'unknown';
                    // console.log(`[DEBUG] Analyzing sibling in ${titleText}: <${tagName}>`);

                    if ($next.is('ol')) {
                        $next.find('> li').each((j, li) => {
                            if (definition) return false;

                            // Clone pour manipuler sans casser le DOM si besoin
                            const $li = $(li).clone();
                            
                            // Suppression des éléments indésirables (exemples, citations, métadonnées)
                            $li.find('ul').remove(); // Exemples
                            $li.find('.exemple').remove();
                            $li.find('figure').remove();
                            $li.find('.h-list-wrapper').remove(); // Boîtes déroulantes éventuelles
                            
                            let text = $li.text().replace(/\n/g, ' ').trim();

                            // Nettoyage temporaire pour vérification du début de phrase
                            // On enlève tout ce qui est entre parenthèses au début pour vérifier "invalidStarts"
                            let textWithoutParens = text.replace(/^\([^)]+\)\s*/, '').trim();
                            
                            // Vérification si la définition commence par une tournure invalide
                            // Ou si elle contient le mot lui-même (case insensitive, mot entier seulement)
                            const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
                            const isInvalid = invalidStarts.some(start => 
                                textWithoutParens.toLowerCase().startsWith(start.toLowerCase()) || 
                                text.length < 5 // Filtre aussi les définitions trop courtes/vides
                            ) || wordRegex.test(text);

                            if (text && !isInvalid) {
                                definition = text;
                            }
                        });
                    }
                    if (definition) break;
                    $next = $next.next();
                }
            }
        });

        return definition;

    } catch (error) {
        console.error(`Error fetching definition for ${word}:`, error.message);
        // En cas d'erreur (404 ou autre), on retourne null
        return null;
    }
}


module.exports = { fetchRandomTitles, fetchDefinition };
