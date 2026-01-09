const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDailyPuzzle } = require('../../utils/gameState');
const { adminIds } = require('../../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('mini')
		.setDescription('Affiche le Mini Crossword du jour'),
	async execute(interaction) {
        if (!adminIds.includes(interaction.user.id)) {
            await interaction.reply({ content: "🚫 Vous n'êtes pas autorisé à lancer le mini crossword.", ephemeral: true });
            return;
        }

        const puzzle = await getDailyPuzzle();
        if (!puzzle) {
            await interaction.reply('Erreur lors de la génération du puzzle. Réessayez plus tard.');
            return;
        }

        const { grid, definitions } = puzzle;
        
        // Build Grid String
        let gridString = '```\n';
        const size = grid.length;
        const topBorder = '+---'.repeat(size) + '+';
        gridString += topBorder + '\n';

        for (let r = 0; r < size; r++) {
            let rowLine = '|';
            for (let c = 0; c < size; c++) {
                if (grid[r][c] === '#') {
                    rowLine += '###|';
                } else {
                    // Check if this cell is a start number
                    const across = definitions.across.find(d => d.row === r && d.col === c);
                    const down = definitions.down.find(d => d.row === r && d.col === c);
                    const num = across ? across.number : (down ? down.number : null);
                    
                    if (num) {
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

        // Build Clues string
        const acrossClues = definitions.across.map(d => `**${d.number}.** ${d.clue} (${d.length})`).join('\n');
        const downClues = definitions.down.map(d => `**${d.number}.** ${d.clue} (${d.length})`).join('\n');

        const embed = new EmbedBuilder()
            .setTitle(`Mini Crossword - ${new Date().toLocaleDateString('fr-FR')}`)
            .setDescription('Complétez la grille en devinant les mots !\nUtilisez `/guess` pour proposer une réponse.')
            .addFields(
                { name: 'Grille', value: gridString },
                { name: 'Horizontal', value: acrossClues || 'Aucun', inline: true },
                { name: 'Vertical', value: downClues || 'Aucun', inline: true }
            )
            .setColor(0x00AE86);

		await interaction.reply({ embeds: [embed] });
	},
};
