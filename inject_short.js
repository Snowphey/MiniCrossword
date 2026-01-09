const fs = require('fs');

const SHORT_WORDS = [
    { word: "LE", def: "Article défini." },
    { word: "LA", def: "Article défini féminin." },
    { word: "DE", def: "Préposition marquant l'origine." },
    { word: "UN", def: "Article indéfini." },
    { word: "ET", def: "Conjonction de coordination." },
    { word: "OU", def: "Marque une alternative." },
    { word: "IL", def: "Pronom personnel masculin." },
    { word: "JE", def: "Pronom personnel première personne." },
    { word: "TU", def: "Pronom personnel deuxième personne." },
    { word: "ON", def: "Pronom indéfini." },
    { word: "MA", def: "Adjectif possessif." },
    { word: "TA", def: "Adjectif possessif." },
    { word: "SA", def: "Adjectif possessif." },
    { word: "ME", def: "Pronom personnel." },
    { word: "TE", def: "Pronom personnel." },
    { word: "SE", def: "Pronom personnel réflexif." },
    { word: "CE", def: "Démonstratif." },
    { word: "NE", def: "Particule de négation." },
    { word: "NI", def: "Négation répétée." },
    { word: "OR", def: "Métal précieux." },
    { word: "SI", def: "Exprime une condition." },
    { word: "AS", def: "Carte à jouer." },
    { word: "ES", def: "Verbe être (2e pers)." },
    { word: "AI", def: "Verbe avoir (1e pers)." },
    { word: "EU", def: "Participe passé d'avoir." },
    { word: "VA", def: "Verbe aller." },
    { word: "VU", def: "Perçu par la vue." },
    { word: "VE", def: "Mouvement (Vite)." },
    { word: "NU", def: "Sans vêtement." },
    { word: "PU", def: "Participe passé de pouvoir." },
    { word: "SU", def: "Participe passé de savoir." },
    { word: "LU", def: "Participe passé de lire." },
    { word: "BU", def: "Participe passé de boire." },
    { word: "MU", def: "Lettre grecque." },
    { word: "XI", def: "Lettre grecque." },
    { word: "PI", def: "Constante mathématique." },
    { word: "RO", def: "Lettre grecque." },
    { word: "AA", def: "Sorte de lave." },
    { word: "AH", def: "Interjection." },
    { word: "OH", def: "Interjection." },
    { word: "EH", def: "Interjection." },
    { word: "AY", def: "Commune de la Marne." },
    { word: "KA", def: "Élément spirituel égyptien." },
    { word: "RA", def: "Dieu solaire égyptien." },
    { word: "RE", def: "Note de musique." },
    { word: "MI", def: "Note de musique." },
    { word: "FA", def: "Note de musique." },
    { word: "SOL", def: "Note de musique." },
    { word: "LA", def: "Note de musique." },
    { word: "SI", def: "Note de musique." },
    { word: "DO", def: "Note de musique." },
    { word: "UT", def: "Note de musique (Do)." },
    { word: "OS", def: "Partie du squelette." },
    { word: "AN", def: "Année." },
    { word: "EN", def: "Préposition." },
    { word: "DU", def: "Contraction de de le." },
    { word: "AU", def: "Contraction de à le." },
    { word: "US", def: "Coutumes, usages." },
    { word: "GO", def: "Jeu de plateau asiatique." },
    { word: "NO", def: "Théâtre japonais." },
    { word: "IF", def: "Arbre conifère." },
    { word: "IN", def: "À la mode." },
    { word: "OM", def: "Syllabe sacrée sanskrite." },
    { word: "ET", def: "Extra-terrestre." },
    { word: "TIC", def: "Mouvement convulsif." },
    { word: "TAC", def: "Bruit sec." },
    { word: "TOC", def: "Faux bijou." },
    { word: "PUY", def: "Montagne volcanique." },
    { word: "PIN", def: "Arbre résineux." },
    { word: "PAN", def: "Morceau d'étoffe." },
    { word: "POT", def: "Récipient." },
    { word: "PEU", def: "Petite quantité." },
    { word: "PAS", def: "Mouvement de marche." },
    { word: "PAR", def: "Préposition." },
    { word: "PRE", def: "Terrain herbeux." },
    { word: "PRO", def: "Professionnel." },
    { word: "PUR", def: "Sans mélange." }
];

const filePath = './src/data/dictionary.json';
try {
    const currentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const currentWords = new Set(currentData.map(e => e.word));

    let added = 0;
    SHORT_WORDS.forEach(short => {
        if (!currentWords.has(short.word)) {
            currentData.push({
                word: short.word,
                original: short.word.toLowerCase(),
                def: short.def
            });
            added++;
        }
    });

    fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2));
    console.log(`Added ${added} short words.`);
} catch (e) {
    console.error("Error updating dict:", e);
}
