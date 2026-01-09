const { SlashCommandBuilder } = require('discord.js');
const { getDailyPuzzle, getUserGrid } = require('../../utils/gameState');
const { formatGrid } = require('../../utils/formatter');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('progress')
		.setDescription('Affiche votre grille actuelle'),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });

        const puzzle = await getDailyPuzzle();
        if (!puzzle) {
            await interaction.editReply('Aucun puzzle généré pour le moment.');
            return;
        }

        const userGrid = getUserGrid(interaction.user.id);
        const gridStr = formatGrid(userGrid, puzzle.definitions);

		await interaction.editReply({ content: `Voici votre progression :\n${gridStr}` });
	},
};
