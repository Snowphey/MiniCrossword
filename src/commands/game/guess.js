const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkGuess, markSolved, hasAlreadyWon, getUserProgress, getUserGrid, getDailyPuzzle } = require('../../utils/gameState');
const { formatGrid, formatClues } = require('../../utils/formatter');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('guess')
		.setDescription('Proposer une réponse pour une définition')
        .addStringOption(option =>
            option.setName('direction')
                .setDescription('Direction du mot')
                .setRequired(true)
                .addChoices(
                    { name: 'Horizontal', value: 'Horizontal' },
                    { name: 'Vertical', value: 'Vertical' },
                ))
        .addStringOption(option =>
            option.setName('numero')
                .setDescription('Numéro de la définition')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('mot')
                .setDescription('Votre réponse')
                .setRequired(true)),
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);

		if (focusedOption.name === 'numero') {
            const puzzle = await getDailyPuzzle();
            if (!puzzle) return interaction.respond([]);

            const userId = interaction.user.id;
            const progress = getUserProgress(userId);
            const solvedDefs = progress.solvedDefs;

            const direction = interaction.options.getString('direction');
			let choices = [];
            
            // Defs source
            let defs = [];
            if (direction) {
                 const dirKey = direction.toLowerCase() === 'horizontal' ? 'across' : 'down';
                 defs = (puzzle.definitions[dirKey] || []).filter(d => !solvedDefs.has(`${dirKey}-${d.number}`));
            } else {
                 // Show all if no direction determined yet
                 const across = (puzzle.definitions.across || [])
                    .filter(d => !solvedDefs.has(`across-${d.number}`))
                    .map(d => ({...d, suffix: ' (Horiz.)'}));
                 const down = (puzzle.definitions.down || [])
                    .filter(d => !solvedDefs.has(`down-${d.number}`))
                    .map(d => ({...d, suffix: ' (Vert.)'}));
                 
                 defs = [...across, ...down];
            }

            // Filter
            const userInput = focusedOption.value.toString().toLowerCase();
            // If userInput is empty, we should still return all options (sliced)
			const filtered = userInput 
                ? defs.filter(choice => 
                    choice.number.toString().startsWith(userInput) || 
                    choice.clue.toLowerCase().includes(userInput))
                : defs;
            
            // Map
			choices = filtered.slice(0, 25).map(choice => ({
                name: `${choice.number}. ${choice.clue.substring(0, 80)}${choice.suffix || ''}`,
                value: choice.number.toString()
            }));

			await interaction.respond(choices);
		}
	},
	async execute(interaction) {
        // Ephemeral so others don't see guesses
		await interaction.deferReply({ ephemeral: true });

        const direction = interaction.options.getString('direction');
        const number = parseInt(interaction.options.getString('numero'), 10);
        const word = interaction.options.getString('mot');
        const userId = interaction.user.id;

        if (hasAlreadyWon(userId)) {
            await interaction.editReply('Vous avez déjà terminé la grille du jour ! Recommencez demain.');
            return;
        }

        const result = await checkGuess(userId, direction, number, word);

        if (result.valid) {
            if (result.isComplete) {
                markSolved(userId);
                
                const progress = getUserProgress(userId);
                const timeTaken = Math.floor((Date.now() - progress.startTime) / 1000);
                const minutes = Math.floor(timeTaken / 60);
                const seconds = timeTaken % 60;
                const timeStr = `${minutes}m ${seconds}s`;

                const puzzle = await getDailyPuzzle();
                const userGrid = getUserGrid(userId);
                const gridStr = formatGrid(userGrid, puzzle.definitions);

                const embed = new EmbedBuilder()
                    .setTitle('🎉 FÉLICITATIONS !')
                    .setDescription(`Vous avez terminé le Mini Crossword !\nTemps: ${timeStr}`)
                    .addFields({ name: 'Grille', value: gridStr })
                    .setColor(0x00FF00);

                // Reply to user ephemerally
                await interaction.editReply({ content: '', embeds: [embed] });
                
                // Public announcement
                await interaction.channel.send(`🏆 <@${userId}> a terminé le Mini Crossword du jour en ${timeStr} !`);
            } else {
                const puzzle = await getDailyPuzzle();
                const userGrid = getUserGrid(userId);
                const gridStr = formatGrid(userGrid, puzzle.definitions);
                
                const progress = getUserProgress(userId);
                const { across, down } = formatClues(puzzle.definitions, progress.solvedDefs);
                
                let feedbackMsg = '';
                if (result.isNew) {
                    feedbackMsg = `✅ **Correct !** (${direction} ${number}: ${word.toUpperCase()})`;
                    if (result.extraRevealed && result.extraRevealed.length > 0) {
                        const extras = result.extraRevealed.map(e => `${e.direction} ${e.number} (${e.word})`).join(', ');
                        feedbackMsg += `\n👀 **Bonus trouvé(s) !** ${extras}`;
                    }
                } else {
                    feedbackMsg = `Mhmm, vous aviez déjà trouvé ce mot. Continuez !`;
                }

                const embed = new EmbedBuilder()
                    .setDescription(feedbackMsg)
                    .addFields(
                        { name: 'Grille', value: gridStr },
                        { name: 'Horizontal', value: across || 'Aucun', inline: true },
                        { name: 'Vertical', value: down || 'Aucun', inline: true }
                    )
                    .setColor(result.isNew ? 0x00AE86 : 0xFFA500);

                await interaction.editReply({ content: '', embeds: [embed] });
            }
        } else {
            await interaction.editReply(`❌ **Incorrect.** ${result.reason || ''} Essaie encore !`);
        }
	},
};
