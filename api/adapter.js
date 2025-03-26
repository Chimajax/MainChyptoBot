// api/adapter.js
const { bot } = require('../bot1');

module.exports = async (update) => {
  // Convert Telegraf-style update to node-telegram-bot-api format
  if (update.message) {
    await bot.processUpdate(update);
  }
};
