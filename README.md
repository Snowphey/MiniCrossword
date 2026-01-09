# Discord Mini Crossword Bot

Un bot Discord qui génère quotidiennement une grille de mots croisés "Mini" (5x5 ou 6x6). Chaque membre du serveur peut tenter de résoudre la grille individuellement grâce à sa propre progression sauvegardée.

## Fonctionnalités

*   **Puzzles Quotidiens** : Une nouvelle grille unique est générée chaque jour à partir d'un dictionnaire local (taille aléatoire 5x5 ou 6x6).
*   **Progression Individuelle** : Chaque joueur possède sa propre grille. Les réponses trouvées sont sauvegardées jusqu'à ce que la grille soit complétée.
*   **Autocomplétion intelligente** : La commande de réponse propose uniquement les définitions non résolues du jour.
*   **Classement** : Une annonce publique est faite lorsqu'un joueur termine la grille avec son temps.

## Commandes

### Joueur
*   `/guess [direction] [numero] [mot]` : Tenter une réponse pour une définition.
    *   *Direction* : Horizontal ou Vertical.
    *   *Numéro* : Le numéro de la définition (supporte l'autocomplétion).
    *   *Mot* : Votre réponse.
    *   Les réponses sont privées (seul vous voyez le résultat).
*   `/progress` : Affiche l'état actuel de votre grille personnelle pour la journée.

### Admin
*   `/mini` : Affiche la grille vierge et toutes les définitions du jour dans le canal (commande réservée aux administrateurs configurés).

## Installation et Configuration

### Prérequis
*   [Node.js](https://nodejs.org/) (v16.9.0 ou supérieur)
*   Un Bot Discord et son Token

### Installation

1.  Clonez le projet.
2.  Installez les dépendances :
    ```bash
    npm install
    ```
3.  Créez le fichier de configuration `src/config.json` :
    ```json
    {
        "clientId": "VOTRE_CLIENT_ID",
        "guildId": "VOTRE_GUILD_ID",
        "token": "VOTRE_TOKEN_BOT",
        "adminIds": ["VOTRE_ID_DISCORD"]
    }
    ```

### Préparation du Dictionnaire

Le bot utilise un dictionnaire local pour générer les grilles. La méthode recommandée utilise un export du Wiktionnaire (`fr-extract.jsonl` ~6Go) pour générer un dictionnaire riche et propre très rapidement.

Vous pouvez trouver les exports ici par exemple : https://kaikki.org/dictionary/rawdata.html

1.  Assurez-vous d'avoir le fichier `fr-extract.jsonl` à la racine du projet.
2.  Lancez le script d'importation :
    ```bash
    node populate_dict.js
    ```
    *Le script va lire le dictionnaire, filtrer les mots (langue, longueur 2-6, validité) et nettoyer les définitions pour générer `src/data/dictionary.json`.*
3.  Observez la répartition des données :
    ```bash
    node analyze_dict.js
    ```
4.  Testez la génération d'une grille pour vérifier que tout fonctionne :
    ```bash
    node test_gen.js
    ```

### Lancement

1.  Déployez les commandes slash sur votre serveur :
    ```bash
    node src/deploy-commands.js
    ```
2.  Lancez le bot :
    ```bash
    npm start
    ```

## Ajouter le bot à un serveur

Pour inviter ce bot sur votre serveur, vous devez générer un lien d'invitation via le [Portail Développeur Discord](https://discord.com/developers/applications).

### Permissions requises

Lors de la génération de l'URL OAuth2, sélectionnez les éléments suivants :

1.  **Scopes** :
    *   `bot`

2.  **Bot Permissions** :
    *   `Send Messages` (Envoyer des messages)
    *   `Embed Links` (Intégrer des liens - utilisé pour l'affichage de la grille)
    *   `View Channels` (Voir les salons)
