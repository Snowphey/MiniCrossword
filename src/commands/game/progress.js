const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDailyPuzzle, getUserGrid, getUserProgress } = require('../../utils/gameState');
const { formatGrid, formatClues } = require('../../utils/formatter');

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

        const userId = interaction.user.id;
        const userGrid = getUserGrid(userId);
        const progress = getUserProgress(userId);

        const gridStr = formatGrid(userGrid, puzzle.definitions);
        const { across, down } = formatClues(puzzle.definitions, progress.solvedDefs);

        const embed = new EmbedBuilder()
            .setTitle('Votre progression')
            .setDescription('Voici où en est votre grille.')
            .addFields(
                { name: 'Grille', value: gridStr },
                { name: 'Horizontal', value: across || 'Aucun', inline: true },
                { name: 'Vertical', value: down || 'Aucun', inline: true }
            )
            .setColor(0x3498db);

		await interaction.editReply({ content: '', embeds: [embed] });
	},
};
