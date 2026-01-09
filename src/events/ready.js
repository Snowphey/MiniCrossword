const { Events } = require('discord.js');
const { getDailyPuzzle } = require('../utils/gameState');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
        // Initialize daily puzzle
        await getDailyPuzzle();
	},
};
